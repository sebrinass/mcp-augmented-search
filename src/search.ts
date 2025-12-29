import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SearXNGWeb } from "./types.js";
import { createProxyAgent } from "./proxy.js";
import { logMessage } from "./logging.js";
import {
  createConfigurationError,
  createNetworkError,
  createServerError,
  createJSONError,
  createDataError,
  createNoResultsMessage,
  type ErrorContext
} from "./error-handler.js";
import { loadConfig } from "./config.js";
import { rerankResults, getEmbedding } from "./embedding.js";
import { getCachedSearch, setCachedSearch, getCacheStats, isSearchDuplicate, getDuplicateSearchResult, markSearchPerformed, findSimilarSearch, setSimilarSearch } from "./cache.js";
import { analyzeQuery, splitComparativeQuery, type QueryAnalysis } from "./query-optimizer.js";
import { incrementSearchRound, recordSearch, getSearchContext, getCacheHint, getDetailedCacheHint, cacheSearchResults } from "./session-tracker.js";

export interface SearchResult {
  title: string;
  content: string;
  url: string;
  score: number;
}

export interface ScoredResult extends SearchResult {
  similarity: number;
}

export interface OptimizedQueryResult {
  original: string;
  optimized: string[];
  type: 'single' | 'comparative' | 'relational';
  shouldSplit: boolean;
  reason: string;
}

export function optimizeQuery(query: string): OptimizedQueryResult {
  const analysis = analyzeQuery(query);
  return {
    original: analysis.original,
    optimized: analysis.transformed,
    type: analysis.type,
    shouldSplit: analysis.needsSplit,
    reason: analysis.reason,
  };
}

export async function performWebSearch(
  server: Server,
  query: string,
  pageno: number = 1,
  time_range?: string,
  language: string = "all",
  safesearch?: string
) {
  const startTime = Date.now();
  
  const searchParams = [
    `page ${pageno}`,
    `lang: ${language}`,
    time_range ? `time: ${time_range}` : null,
    safesearch ? `safesearch: ${safesearch}` : null
  ].filter(Boolean).join(", ");
  
  logMessage(server, "info", `Starting web search: "${query}" (${searchParams})`);

  incrementSearchRound();
  const initialCacheHint = getCacheHint(query);
  if (initialCacheHint) {
    logMessage(server, "info", `Cache hint: ${initialCacheHint}`);
  }

  if (isSearchDuplicate(query)) {
    const cachedResults = getDuplicateSearchResult(query);
    const duration = Date.now() - startTime;
    
    if (cachedResults) {
      logMessage(server, "info", `Session duplicate detected: "${query}" - returning cached results in ${duration}ms`);
      const sessionConfig = loadConfig();
      const detailedCacheHint = getDetailedCacheHint(query);
      const cacheMarker = detailedCacheHint ? `${detailedCacheHint}\n\n` : '';
      const resultsText = cachedResults
        .slice(0, sessionConfig.embedding.topK)
        .map((r) => `Title: ${r.title}\nDescription: ${r.content}\nURL: ${r.url}\nRelevance Score: ${r.score.toFixed(3)}`)
        .join("\n\n");
      return `${cacheMarker}📋 【缓存命中】此搜索结果来自会话缓存 (${duration}ms)\n\n${resultsText}`;
    } else {
      logMessage(server, "info", `Session duplicate detected: "${query}" - will skip empty result`);
      return createNoResultsMessage(query);
    }
  }
  
  const config = loadConfig();
  
  if (config.embedding.enabled) {
    const similarResults = await findSimilarSearch(query);
    if (similarResults) {
      const duration = Date.now() - startTime;
      logMessage(server, "info", `Semantic cache hit: "${query}" - returning similar results in ${duration}ms`);
      const detailedCacheHint = getDetailedCacheHint(query);
      const cacheMarker = detailedCacheHint ? `${detailedCacheHint}\n\n` : '';
      const resultsText = similarResults
        .slice(0, config.embedding.topK)
        .map((r) => `Title: ${r.title}\nDescription: ${r.content}\nURL: ${r.url}\nRelevance Score: ${r.score.toFixed(3)}`)
        .join("\n\n");
      return `${cacheMarker}🧠 【语义缓存命中】找到相似搜索结果 (${duration}ms)\n\n${resultsText}`;
    }
  }
  
  const searxngUrl = process.env.SEARXNG_URL;

  if (!searxngUrl) {
    logMessage(server, "error", "SEARXNG_URL not configured");
    throw createConfigurationError(
      "SEARXNG_URL not set. Set it to your SearXNG instance (e.g., http://localhost:8080 or https://search.example.com)"
    );
  }

  // Validate that searxngUrl is a valid URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(searxngUrl);
  } catch (error) {
    throw createConfigurationError(
      `Invalid SEARXNG_URL format: ${searxngUrl}. Use format: http://localhost:8080`
    );
  }

  const url = new URL('/search', parsedUrl);

  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("pageno", pageno.toString());

  if (
    time_range !== undefined &&
    ["day", "month", "year"].includes(time_range)
  ) {
    url.searchParams.set("time_range", time_range);
  }

  if (language && language !== "all") {
    url.searchParams.set("language", language);
  }

  if (safesearch !== undefined && ["0", "1", "2"].includes(safesearch)) {
    url.searchParams.set("safesearch", safesearch);
  }

  // Prepare request options with headers
  const requestOptions: RequestInit = {
    method: "GET"
  };

  // Add proxy dispatcher if proxy is configured
  // Node.js fetch uses 'dispatcher' option for proxy, not 'agent'
  const proxyAgent = createProxyAgent(url.toString());
  if (proxyAgent) {
    (requestOptions as any).dispatcher = proxyAgent;
  }

  // Add basic authentication if credentials are provided
  const username = process.env.AUTH_USERNAME;
  const password = process.env.AUTH_PASSWORD;

  if (username && password) {
    const base64Auth = Buffer.from(`${username}:${password}`).toString('base64');
    requestOptions.headers = {
      ...requestOptions.headers,
      'Authorization': `Basic ${base64Auth}`
    };
  }

  // Add User-Agent header if configured
  const userAgent = process.env.USER_AGENT;
  if (userAgent) {
    requestOptions.headers = {
      ...requestOptions.headers,
      'User-Agent': userAgent
    };
  }

  // Fetch with enhanced error handling
  let response: Response;
  try {
    logMessage(server, "info", `Making request to: ${url.toString()}`);
    response = await fetch(url.toString(), requestOptions);
  } catch (error: any) {
    logMessage(server, "error", `Network error during search request: ${error.message}`, { query, url: url.toString() });
    const context: ErrorContext = {
      url: url.toString(),
      searxngUrl,
      proxyAgent: !!proxyAgent,
      username
    };
    throw createNetworkError(error, context);
  }

  if (!response.ok) {
    let responseBody: string;
    try {
      responseBody = await response.text();
    } catch {
      responseBody = '[Could not read response body]';
    }

    const context: ErrorContext = {
      url: url.toString(),
      searxngUrl
    };
    throw createServerError(response.status, response.statusText, responseBody, context);
  }

  // Parse JSON response
  let data: SearXNGWeb;
  try {
    data = (await response.json()) as SearXNGWeb;
  } catch (error: any) {
    let responseText: string;
    try {
      responseText = await response.text();
    } catch {
      responseText = '[Could not read response text]';
    }

    const context: ErrorContext = { url: url.toString() };
    throw createJSONError(responseText, context);
  }

  if (!data.results) {
    const context: ErrorContext = { url: url.toString(), query };
    throw createDataError(data, context);
  }

  const results = data.results.map((result) => ({
    title: result.title || "",
    content: result.content || "",
    url: result.url || "",
    score: result.score || 0,
  }));

  if (results.length === 0) {
    logMessage(server, "info", `No results found for query: "${query}"`);
    return createNoResultsMessage(query);
  }

  const cacheKey = `${query}_${pageno}_${time_range}_${language}_${safesearch}`;
  const cachedResult = getCachedSearch(cacheKey);
  if (cachedResult) {
    const duration = Date.now() - startTime;
    logMessage(server, "info", `Search cache hit: "${query}" (${searchParams}) - ${cachedResult.results.length} results in ${duration}ms (cached)`);
    const cachedConfig = loadConfig();
    const cacheHint = getDetailedCacheHint(query);
    const cacheMarker = cacheHint ? `${cacheHint}\n\n` : '';
    const resultsText = cachedResult.results
      .slice(0, cachedConfig.embedding.topK)
      .map((r) => `Title: ${r.title}\nDescription: ${r.content}\nURL: ${r.url}\nRelevance Score: ${r.score.toFixed(3)}`)
      .join("\n\n");
    return `${cacheMarker}💾 【磁盘缓存命中】此搜索结果来自缓存 (${duration}ms)\n\n${resultsText}`;
  }

  setCachedSearch(cacheKey, results);

  let finalResults = results;

  if (config.embedding.enabled && results.length > 0) {
    try {
      logMessage(server, "info", `Starting embedding-based reranking for query: "${query}"`);
      const queryEmbedding = await getEmbedding(query);

      if (queryEmbedding.length > 0) {
        const scoredResults = await rerankResults(query, results);
        finalResults = scoredResults.map((r) => ({
          title: r.title,
          content: r.content,
          url: r.url,
          score: r.embeddingScore,
        }));
        logMessage(server, "info", `Embedding reranking completed: ${scoredResults.length} results ranked by similarity`);
      } else {
        logMessage(server, "warning", "Embedding generation failed, falling back to original results");
      }
    } catch (error: any) {
      logMessage(server, "error", `Embedding reranking error: ${error.message}, falling back to original results`);
    }
  }

  const duration = Date.now() - startTime;
  logMessage(server, "info", `Search completed: "${query}" (${searchParams}) - ${finalResults.length} results in ${duration}ms`);

  markSearchPerformed(query, finalResults);

  recordSearch(query);
  logMessage(server, "info", `Search recorded: "${query}"`);

  cacheSearchResults(query, JSON.stringify(finalResults));

  const embeddingConfig = loadConfig().embedding;
  if (embeddingConfig.enabled && finalResults.length > 0) {
    await setSimilarSearch(query, finalResults);
    logMessage(server, "info", `Saved to semantic cache: "${query}"`);
  }

  const searchContext = getSearchContext();
  const cacheHint = getDetailedCacheHint(query);
  const contextMarker = [searchContext, cacheHint].filter(Boolean).join('\n\n');

  const resultsText = finalResults
    .map((r) => `Title: ${r.title}\nDescription: ${r.content}\nURL: ${r.url}\nRelevance Score: ${r.score.toFixed(3)}`)
    .join("\n\n");

  return `${contextMarker}\n\n🔍 【新搜索结果】耗时 ${duration}ms\n\n${resultsText}`;
}
