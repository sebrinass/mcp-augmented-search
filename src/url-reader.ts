import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { NodeHtmlMarkdown } from "node-html-markdown";
import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import { createProxyAgent } from "./proxy.js";
import { logMessage } from "./logging.js";
import { urlCache } from "./cache.js";
import { incrementUrlReadRound, recordUrlRead, getUrlReadContext, getCacheHint, getDetailedCacheHint, cacheUrlContent } from "./session-tracker.js";
import { loadConfig } from "./config.js";
import { isUrlAllowed } from "./robots.js";
import {
  createURLFormatError,
  createNetworkError,
  createServerError,
  createContentError,
  createConversionError,
  createTimeoutError,
  createEmptyContentWarning,
  createUnexpectedError,
  type ErrorContext
} from "./error-handler.js";

interface PaginationOptions {
  startChar?: number;
  maxLength?: number;
  section?: string;
  paragraphRange?: string;
  readHeadings?: boolean;
}

function applyCharacterPagination(content: string, startChar: number = 0, maxLength?: number): string {
  if (startChar >= content.length) {
    return "";
  }

  const start = Math.max(0, startChar);
  const end = maxLength ? Math.min(content.length, start + maxLength) : content.length;

  return content.slice(start, end);
}

function extractSection(markdownContent: string, sectionHeading: string): string {
  const lines = markdownContent.split('\n');
  const sectionRegex = new RegExp(`^#{1,6}\s*.*${sectionHeading}.*$`, 'i');

  let startIndex = -1;
  let currentLevel = 0;

  // Find the section start
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (sectionRegex.test(line)) {
      startIndex = i;
      currentLevel = (line.match(/^#+/) || [''])[0].length;
      break;
    }
  }

  if (startIndex === -1) {
    return "";
  }

  // Find the section end (next heading of same or higher level)
  let endIndex = lines.length;
  for (let i = startIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^#+/);
    if (match && match[0].length <= currentLevel) {
      endIndex = i;
      break;
    }
  }

  return lines.slice(startIndex, endIndex).join('\n');
}

function extractParagraphRange(markdownContent: string, range: string): string {
  const paragraphs = markdownContent.split('\n\n').filter(p => p.trim().length > 0);

  // Parse range (e.g., "1-5", "3", "10-")
  const rangeMatch = range.match(/^(\d+)(?:-(\d*))?$/);
  if (!rangeMatch) {
    return "";
  }

  const start = parseInt(rangeMatch[1]) - 1; // Convert to 0-based index
  const endStr = rangeMatch[2];

  if (start < 0 || start >= paragraphs.length) {
    return "";
  }

  if (endStr === undefined) {
    // Single paragraph (e.g., "3")
    return paragraphs[start] || "";
  } else if (endStr === "") {
    // Range to end (e.g., "10-")
    return paragraphs.slice(start).join('\n\n');
  } else {
    // Specific range (e.g., "1-5")
    const end = parseInt(endStr);
    return paragraphs.slice(start, end).join('\n\n');
  }
}

function extractHeadings(markdownContent: string): string {
  const lines = markdownContent.split('\n');
  const headings = lines.filter(line => /^#{1,6}\s/.test(line));

  if (headings.length === 0) {
    return "No headings found in the content.";
  }

  return headings.join('\n');
}

function resolveRedirectUrl(server: Server, url: string): string {
  try {
    const parsedUrl = new URL(url);

    // Detect various redirect link formats (sogou, baidu, 360, etc.)
    if (parsedUrl.searchParams.has('url')) {
      let realUrl = parsedUrl.searchParams.get('url');
      
      if (realUrl) {
        // Handle relative URLs (no protocol prefix)
        if (!realUrl.startsWith('http://') && !realUrl.startsWith('https://')) {
          // Try to construct full URL from the redirect link's base
          const baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}`;
          realUrl = new URL(realUrl, baseUrl).href;
        }
        
        logMessage(server, 'info', `Resolved redirect URL: ${url} -> ${realUrl}`);
        return realUrl;
      }
    }

    return url;
  } catch {
    return url;
  }
}

function applyPaginationOptions(markdownContent: string, options: PaginationOptions): string {
  let result = markdownContent;

  // Apply heading extraction first if requested
  if (options.readHeadings) {
    return extractHeadings(result);
  }

  // Apply section extraction
  if (options.section) {
    result = extractSection(result, options.section);
    if (result === "") {
      return `Section "${options.section}" not found in the content.`;
    }
  }

  // Apply paragraph range filtering
  if (options.paragraphRange) {
    result = extractParagraphRange(result, options.paragraphRange);
    if (result === "") {
      return `Paragraph range "${options.paragraphRange}" is invalid or out of bounds.`;
    }
  }

  // Apply character-based pagination last
  if (options.startChar !== undefined || options.maxLength !== undefined) {
    result = applyCharacterPagination(result, options.startChar, options.maxLength);
  }

  return result;
}

export async function fetchAndConvertToMarkdown(
  server: Server,
  url: string,
  timeoutMs?: number,
  paginationOptions: PaginationOptions = {}
) {
  const startTime = Date.now();
  const config = loadConfig();
  
  const fetchTimeout = timeoutMs ?? config.fetch.timeoutMs;
  
  const userAgent = config.userAgent || "MCP-SearXNG/1.0 (+https://github.com/sebrinass/mcp-searxng)";
  
  logMessage(server, "info", `Fetching URL: ${url} (timeout: ${fetchTimeout}ms, user-agent: ${userAgent})`);

  incrementUrlReadRound();
  const cacheHint = getCacheHint(url);
  if (cacheHint) {
    logMessage(server, "info", `Cache hint: ${cacheHint}`);
  }

  // Resolve redirect URLs (sogou, baidu, 360, etc.)
  const resolvedUrl = resolveRedirectUrl(server, url);

  // Check cache first
  const cachedEntry = urlCache.get(resolvedUrl);
  if (cachedEntry) {
    logMessage(server, "info", `Using cached content for URL: ${resolvedUrl}`);
    recordUrlRead(resolvedUrl);
    const result = applyPaginationOptions(cachedEntry.markdownContent, paginationOptions);
    const duration = Date.now() - startTime;
    logMessage(server, "info", `Processed cached URL: ${resolvedUrl} (${result.length} chars in ${duration}ms)`);
    
    const cacheHint = getDetailedCacheHint(resolvedUrl);
    const cacheMarker = cacheHint ? `${cacheHint}\n\n` : '';
    const readContext = getUrlReadContext();
    
    return `${readContext}\n\n${cacheMarker}💾 【缓存命中】此页面内容来自URL缓存 (${duration}ms)\n\n${result}`;
  }
  
  // Validate URL format
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(resolvedUrl);
  } catch (error) {
    logMessage(server, "error", `Invalid URL format: ${resolvedUrl}`);
    throw createURLFormatError(resolvedUrl);
  }

  // Check robots.txt if enabled
  const allowed = await isUrlAllowed(resolvedUrl);
  if (!allowed) {
    logMessage(server, "warning", `URL blocked by robots.txt: ${resolvedUrl}`);
    throw createContentError("Access to this URL is blocked by the website's robots.txt policy.", resolvedUrl);
  }

  // Create an AbortController instance
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), fetchTimeout);

  try {
    // Prepare request options with proxy support
    const requestOptions: RequestInit = {
      signal: controller.signal,
      headers: {
        "User-Agent": userAgent
      }
    };

    // Add proxy dispatcher if proxy is configured
    // Node.js fetch uses 'dispatcher' option for proxy, not 'agent'
    const proxyAgent = createProxyAgent(resolvedUrl);
    if (proxyAgent) {
      (requestOptions as any).dispatcher = proxyAgent;
    }

    let response: Response;
    try {
      // Fetch the URL with the abort signal
      response = await fetch(resolvedUrl, requestOptions);
    } catch (error: any) {
      const context: ErrorContext = {
        url: resolvedUrl,
        proxyAgent: !!proxyAgent,
        timeout: timeoutMs
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

      const context: ErrorContext = { url: resolvedUrl };
      throw createServerError(response.status, response.statusText, responseBody, context);
    }

    // Retrieve HTML content
    let htmlContent: string;
    try {
      htmlContent = await response.text();
    } catch (error: any) {
      throw createContentError(
        `Failed to read website content: ${error.message || 'Unknown error reading content'}`,
        resolvedUrl
      );
    }

    if (!htmlContent || htmlContent.trim().length === 0) {
      throw createContentError("Website returned empty content.", resolvedUrl);
    }

    // Extract main content using Readability
    let extractedHtmlContent: string;
    try {
      const dom = new JSDOM(htmlContent);
      const reader = new Readability(dom.window.document);
      const article = reader.parse();
      
      if (article && article.content) {
        extractedHtmlContent = article.content;
        logMessage(server, "info", `Successfully extracted main content from: ${resolvedUrl}`);
      } else {
        logMessage(server, "warning", `Readability failed to extract content from: ${resolvedUrl}, using full HTML`);
        extractedHtmlContent = htmlContent;
      }
    } catch (error: any) {
      logMessage(server, "warning", `Readability extraction failed: ${error.message}, using full HTML`);
      extractedHtmlContent = htmlContent;
    }

    // Convert HTML to Markdown
    let markdownContent: string;
    try {
      markdownContent = NodeHtmlMarkdown.translate(extractedHtmlContent);
    } catch (error: any) {
      logMessage(server, "warning", `Failed to convert HTML to Markdown, returning raw HTML: ${error.message}`);
      // Return raw HTML as fallback
      markdownContent = extractedHtmlContent;
    }

    if (!markdownContent || markdownContent.trim().length === 0) {
      logMessage(server, "warning", `Empty content after conversion: ${resolvedUrl}`);
      // DON'T cache empty/failed conversions - return warning directly
      return createEmptyContentWarning(resolvedUrl, htmlContent.length, htmlContent);
    }

    // Only cache successful markdown conversion
    urlCache.set(resolvedUrl, htmlContent, markdownContent);
    
    cacheUrlContent(resolvedUrl, markdownContent);

    // Apply pagination options
    const result = applyPaginationOptions(markdownContent, paginationOptions);

    const duration = Date.now() - startTime;
    logMessage(server, "info", `Successfully fetched and converted URL: ${url} (${result.length} chars in ${duration}ms)`);
    
    recordUrlRead(resolvedUrl);
    
    const readContext = getUrlReadContext();
    const cacheHint = getDetailedCacheHint(resolvedUrl);
    const contextMarker = [readContext, cacheHint].filter(Boolean).join('\n\n');
    
    let finalResult = result;
    
    // Add continuation hint if content was truncated
    if (paginationOptions.maxLength && markdownContent.length > paginationOptions.maxLength) {
      const remaining = markdownContent.length - paginationOptions.maxLength;
      const nextStart = (paginationOptions.startChar || 0) + paginationOptions.maxLength;
      finalResult += `\n\n⏭️ 内容已截断，剩余 ${remaining} 字符。如需继续读取，请使用 start_index=${nextStart} 参数。`;
    }
    
    return `${contextMarker}\n\n📄 【新页面内容】${resolvedUrl} (${finalResult.length}字符, ${duration}ms)\n\n${finalResult}`;
  } catch (error: any) {
    if (error.name === "AbortError") {
      logMessage(server, "error", `Timeout fetching URL: ${resolvedUrl} (${fetchTimeout}ms)`);
      throw createTimeoutError(fetchTimeout, resolvedUrl);
    }
    // Re-throw our enhanced errors
    if (error.name === 'MCPSearXNGError') {
      logMessage(server, "error", `Error fetching URL: ${resolvedUrl} - ${error.message}`);
      throw error;
    }
    
    // Catch any unexpected errors
    logMessage(server, "error", `Unexpected error fetching URL: ${resolvedUrl}`, error);
    const context: ErrorContext = { url: resolvedUrl };
    throw createUnexpectedError(error, context);
  } finally {
    // Clean up the timeout to prevent memory leaks
    clearTimeout(timeoutId);
  }
}

export async function fetchAndConvertToMarkdownBatch(
  server: Server,
  urls: string[],
  timeoutMs?: number,
  paginationOptions: PaginationOptions = {}
): Promise<string> {
  const startTime = Date.now();
  const config = loadConfig();
  const fetchTimeout = timeoutMs ?? config.fetch.timeoutMs;
  
  logMessage(server, "info", `Starting batch URL fetch: ${urls.length} URLs (timeout: ${fetchTimeout}ms)`);

  if (urls.length === 0) {
    return "No URLs provided for batch reading.";
  }

  const results: Array<{ url: string; content: string; error?: string }> = [];

  const fetchPromises = urls.map(async (url) => {
    try {
      const content = await fetchAndConvertToMarkdown(server, url, timeoutMs, paginationOptions);
      results.push({ url, content });
    } catch (error: any) {
      results.push({
        url,
        content: "",
        error: error.message || "Unknown error"
      });
    }
  });

  await Promise.all(fetchPromises);

  const duration = Date.now() - startTime;
  const successCount = results.filter(r => !r.error).length;
  const errorCount = results.filter(r => r.error).length;

  logMessage(server, "info", `Batch URL fetch completed: ${successCount}/${urls.length} successful in ${duration}ms`);

  let output = `=== Batch URL Reading Results (${urls.length} URLs, ${successCount} success, ${errorCount} failed) ===\n\n`;

  for (const result of results) {
    if (result.error) {
      output += `[URL: ${result.url}]\nError: ${result.error}\n\n---\n\n`;
    } else {
      output += `[URL: ${result.url}]\n${result.content}\n\n---\n\n`;
    }
  }

  return output;
}
