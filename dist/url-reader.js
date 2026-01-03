import { NodeHtmlMarkdown } from "node-html-markdown";
import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import { createProxyAgent } from "./proxy.js";
import { logMessage } from "./logging.js";
import { urlCache } from "./cache.js";
import { incrementUrlReadRound, recordUrlRead, getUrlReadContext, getCacheHint, getDetailedCacheHint, cacheUrlContent } from "./session-tracker.js";
import { loadConfig } from "./config.js";
import { isUrlAllowed } from "./robots.js";
import { createURLFormatError, createServerError, createContentError, createTimeoutError, createUnexpectedError } from "./error-handler.js";
let puppeteer = null;
async function getPuppeteer() {
    if (!puppeteer) {
        try {
            puppeteer = await import('puppeteer-core');
        }
        catch (e) {
            console.log('Puppeteer not installed. Browser rendering disabled.');
        }
    }
    return puppeteer;
}
let browser = null;
async function getBrowser() {
    const puppeteerModule = await getPuppeteer();
    if (!puppeteerModule) {
        throw new Error('Puppeteer not installed. Browser rendering disabled.');
    }
    if (!browser) {
        const chromiumPath = process.env.PUPPETEER_EXECUTABLE_PATH ||
            process.platform === 'linux' ? '/usr/bin/chromium-browser' :
            process.platform === 'darwin' ? '/Applications/Chromium.app/Contents/MacOS/Chromium' :
                'C:\\Program Files\\Chromium\\Application\\chrome.exe';
        browser = await puppeteerModule.launch({
            executablePath: chromiumPath,
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
    }
    return browser;
}
async function closeBrowser() {
    if (browser) {
        await browser.close();
        browser = null;
    }
}
async function fetchWithPuppeteer(url, timeoutMs, paginationOptions = {}) {
    const startTime = Date.now();
    const b = await getBrowser();
    try {
        const page = await b.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: timeoutMs
        });
        let content = await page.content();
        if (paginationOptions.startChar || paginationOptions.maxLength) {
            content = applyCharacterPagination(content, paginationOptions.startChar, paginationOptions.maxLength);
        }
        await page.close();
        const dom = new JSDOM(content);
        const reader = new Readability(dom.window.document);
        const article = reader.parse();
        if (article && article.content) {
            content = NodeHtmlMarkdown.translate(article.content);
        }
        const duration = Date.now() - startTime;
        console.log(`Puppeteer fetch completed: ${url} (${content.length} chars in ${duration}ms)`);
        return content;
    }
    catch (error) {
        console.error(`Puppeteer fetch failed: ${error.message}`);
        throw error;
    }
}
function applyCharacterPagination(content, startChar = 0, maxLength) {
    if (startChar >= content.length) {
        return "";
    }
    const start = Math.max(0, startChar);
    const end = maxLength ? Math.min(content.length, start + maxLength) : content.length;
    return content.slice(start, end);
}
function extractSection(markdownContent, sectionHeading) {
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
function extractParagraphRange(markdownContent, range) {
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
    }
    else if (endStr === "") {
        // Range to end (e.g., "10-")
        return paragraphs.slice(start).join('\n\n');
    }
    else {
        // Specific range (e.g., "1-5")
        const end = parseInt(endStr);
        return paragraphs.slice(start, end).join('\n\n');
    }
}
function extractHeadings(markdownContent) {
    const lines = markdownContent.split('\n');
    const headings = lines.filter(line => /^#{1,6}\s/.test(line));
    if (headings.length === 0) {
        return "No headings found in the content.";
    }
    return headings.join('\n');
}
function resolveRedirectUrl(server, url) {
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
    }
    catch {
        return url;
    }
}
function applyPaginationOptions(markdownContent, options) {
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
export async function fetchAndConvertToMarkdown(server, url, timeoutMs, paginationOptions = {}, sessionId = "default") {
    const startTime = Date.now();
    const config = loadConfig();
    const fetchTimeout = timeoutMs ?? config.fetch.timeoutMs;
    const userAgent = config.userAgent || "MCP-SearXNG/1.0 (+https://github.com/sebrinass/mcp-searxng)";
    logMessage(server, "info", `Fetching URL: ${url} (timeout: ${fetchTimeout}ms, user-agent: ${userAgent})`);
    incrementUrlReadRound(sessionId);
    const cacheHint = getCacheHint(sessionId, url);
    if (cacheHint) {
        logMessage(server, "info", `Cache hint: ${cacheHint}`);
    }
    // Resolve redirect URLs (sogou, baidu, 360, etc.)
    const resolvedUrl = resolveRedirectUrl(server, url);
    // Check cache first
    const cachedEntry = urlCache.get(resolvedUrl);
    if (cachedEntry) {
        logMessage(server, "info", `Using cached content for URL: ${resolvedUrl}`);
        recordUrlRead(sessionId, resolvedUrl);
        const result = applyPaginationOptions(cachedEntry.markdownContent, paginationOptions);
        const duration = Date.now() - startTime;
        logMessage(server, "info", `Processed cached URL: ${resolvedUrl} (${result.length} chars in ${duration}ms)`);
        const cacheHint = getDetailedCacheHint(sessionId, resolvedUrl);
        const cacheMarker = cacheHint ? `${cacheHint}\n\n` : '';
        const readContext = getUrlReadContext(sessionId);
        return `${readContext}\n\n${cacheMarker}💾 【缓存命中】此页面内容来自URL缓存 (${duration}ms)\n\n${result}`;
    }
    // Validate URL format
    let parsedUrl;
    try {
        parsedUrl = new URL(resolvedUrl);
    }
    catch (error) {
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
        const requestOptions = {
            signal: controller.signal,
            headers: {
                "User-Agent": userAgent
            }
        };
        // Add proxy dispatcher if proxy is configured
        // Node.js fetch uses 'dispatcher' option for proxy, not 'agent'
        const proxyAgent = createProxyAgent(resolvedUrl);
        if (proxyAgent) {
            requestOptions.dispatcher = proxyAgent;
        }
        let response = null;
        let usePuppeteer = false;
        try {
            // Fetch the URL with the abort signal
            response = await fetch(resolvedUrl, requestOptions);
        }
        catch (error) {
            logMessage(server, "warning", `Fetch failed: ${error.message}, falling back to Puppeteer`);
            usePuppeteer = true;
        }
        if (!usePuppeteer && response) {
            if (!response.ok) {
                let responseBody;
                try {
                    responseBody = await response.text();
                }
                catch {
                    responseBody = '[Could not read response body]';
                }
                const context = { url: resolvedUrl };
                throw createServerError(response.status, response.statusText, responseBody, context);
            }
            // Retrieve HTML content
            let htmlContent;
            try {
                htmlContent = await response.text();
            }
            catch (error) {
                throw createContentError(`Failed to read website content: ${error.message || 'Unknown error reading content'}`, resolvedUrl);
            }
            if (!htmlContent || htmlContent.trim().length === 0) {
                logMessage(server, "warning", `Empty HTML content: ${resolvedUrl}, falling back to Puppeteer`);
                usePuppeteer = true;
            }
            if (!usePuppeteer) {
                // Extract main content using Readability
                let extractedHtmlContent;
                try {
                    const dom = new JSDOM(htmlContent);
                    const reader = new Readability(dom.window.document);
                    const article = reader.parse();
                    if (article && article.content) {
                        extractedHtmlContent = article.content;
                        logMessage(server, "info", `Successfully extracted main content from: ${resolvedUrl}`);
                    }
                    else {
                        logMessage(server, "warning", `Readability failed to extract content from: ${resolvedUrl}, using full HTML`);
                        extractedHtmlContent = htmlContent;
                    }
                }
                catch (error) {
                    logMessage(server, "warning", `Readability extraction failed: ${error.message}, using full HTML`);
                    extractedHtmlContent = htmlContent;
                }
                // Convert HTML to Markdown
                let markdownContent;
                try {
                    markdownContent = NodeHtmlMarkdown.translate(extractedHtmlContent);
                }
                catch (error) {
                    logMessage(server, "warning", `Failed to convert HTML to Markdown, returning raw HTML: ${error.message}`);
                    // Return raw HTML as fallback
                    markdownContent = extractedHtmlContent;
                }
                if (!markdownContent || markdownContent.trim().length === 0) {
                    logMessage(server, "warning", `Empty content after conversion: ${resolvedUrl}, falling back to Puppeteer`);
                    usePuppeteer = true;
                }
                if (!usePuppeteer) {
                    // Only cache successful markdown conversion
                    urlCache.set(resolvedUrl, htmlContent, markdownContent);
                    cacheUrlContent(resolvedUrl, markdownContent);
                    // Apply pagination options
                    const result = applyPaginationOptions(markdownContent, paginationOptions);
                    const duration = Date.now() - startTime;
                    logMessage(server, "info", `Successfully fetched and converted URL: ${url} (${result.length} chars in ${duration}ms)`);
                    recordUrlRead(sessionId, resolvedUrl);
                    const readContext = getUrlReadContext(sessionId);
                    const cacheHint = getDetailedCacheHint(sessionId, resolvedUrl);
                    const contextMarker = [readContext, cacheHint].filter(Boolean).join('\n\n');
                    let finalResult = result;
                    // Add continuation hint if content was truncated
                    if (paginationOptions.maxLength && markdownContent.length > paginationOptions.maxLength) {
                        const remaining = markdownContent.length - paginationOptions.maxLength;
                        const nextStart = (paginationOptions.startChar || 0) + paginationOptions.maxLength;
                        finalResult += `\n\n⏭️ 内容已截断，剩余 ${remaining} 字符。如需继续读取，请使用 start_index=${nextStart} 参数。`;
                    }
                    return `${contextMarker}\n\n📄 【新页面内容】${resolvedUrl} (${finalResult.length}字符, ${duration}ms)\n\n${finalResult}`;
                }
            }
        }
        // Fallback to Puppeteer
        if (usePuppeteer && puppeteer) {
            try {
                const puppeteerContent = await fetchWithPuppeteer(resolvedUrl, fetchTimeout, paginationOptions);
                urlCache.set(resolvedUrl, '', puppeteerContent);
                cacheUrlContent(resolvedUrl, puppeteerContent);
                const duration = Date.now() - startTime;
                logMessage(server, "info", `Successfully fetched with Puppeteer: ${url} (${puppeteerContent.length} chars in ${duration}ms)`);
                recordUrlRead(sessionId, resolvedUrl);
                const readContext = getUrlReadContext(sessionId);
                const cacheHint = getDetailedCacheHint(sessionId, resolvedUrl);
                const contextMarker = [readContext, cacheHint].filter(Boolean).join('\n\n');
                let finalResult = puppeteerContent;
                if (paginationOptions.maxLength && puppeteerContent.length > paginationOptions.maxLength) {
                    const remaining = puppeteerContent.length - paginationOptions.maxLength;
                    const nextStart = (paginationOptions.startChar || 0) + paginationOptions.maxLength;
                    finalResult += `\n\n⏭️ 内容已截断，剩余 ${remaining} 字符。如需继续读取，请使用 start_index=${nextStart} 参数。`;
                }
                return `${contextMarker}\n\n🌐 【浏览器渲染】${resolvedUrl} (${finalResult.length}字符, ${duration}ms)\n\n${finalResult}`;
            }
            catch (error) {
                logMessage(server, "error", `Puppeteer fallback failed: ${error.message}`);
                throw createContentError(`Both fetch and Puppeteer failed: ${error.message}`, resolvedUrl);
            }
        }
    }
    catch (error) {
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
        const context = { url: resolvedUrl };
        throw createUnexpectedError(error, context);
    }
    finally {
        // Clean up the timeout to prevent memory leaks
        clearTimeout(timeoutId);
    }
}
export async function fetchAndConvertToMarkdownBatch(server, urls, timeoutMs, paginationOptions = {}, sessionId = "default") {
    const startTime = Date.now();
    const config = loadConfig();
    const fetchTimeout = timeoutMs ?? config.fetch.timeoutMs;
    logMessage(server, "info", `Starting batch URL fetch: ${urls.length} URLs (timeout: ${fetchTimeout}ms)`);
    if (urls.length === 0) {
        return "No URLs provided for batch reading.";
    }
    const results = [];
    const fetchPromises = urls.map(async (url) => {
        try {
            const content = await fetchAndConvertToMarkdown(server, url, timeoutMs, paginationOptions, sessionId);
            results.push({ url, content });
        }
        catch (error) {
            const errorMessage = error?.message;
            results.push({
                url,
                content: "",
                error: errorMessage ?? "Unknown error"
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
        }
        else {
            output += `[URL: ${result.url}]\n${result.content}\n\n---\n\n`;
        }
    }
    return output;
}
