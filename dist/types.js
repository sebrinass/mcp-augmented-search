export const READ_URL_TOOL = {
    name: "read",
    description: "读取 URL 的内容",
    inputSchema: {
        type: "object",
        properties: {
            url: {
                type: "string",
                description: "URL to read",
            },
            urls: {
                type: "array",
                items: { type: "string" },
                description: "Array of URLs to read in batch (alternative to single url parameter)",
            },
            startChar: {
                type: "number",
                description: "Starting character position for content extraction (default: 0)",
                minimum: 0,
            },
            maxLength: {
                type: "number",
                description: "Maximum number of characters to return per URL",
                minimum: 1,
            },
            section: {
                type: "string",
                description: "Extract content under a specific heading (searches for heading text)",
            },
            paragraphRange: {
                type: "string",
                description: "Return specific paragraph ranges (e.g., '1-5', '3', '10-')",
            },
            readHeadings: {
                type: "boolean",
                description: "Return only a list of headings instead of full content",
            },
            timeoutMs: {
                type: "number",
                description: "Request timeout in milliseconds (default: 30000, from FETCH_TIMEOUT_MS env var)",
                minimum: 1000,
            },
        },
    },
};
export function isWebUrlReadArgs(args) {
    return (typeof args === "object" &&
        args !== null &&
        (("url" in args && typeof args.url === "string") ||
            ("urls" in args && Array.isArray(args.urls))));
}
export const CRAWL_SITE_TOOL = {
    name: "crawl",
    description: "爬取站点，返回链接列表、标题和摘要",
    inputSchema: {
        type: "object",
        properties: {
            url: {
                type: "string",
                description: "种子 URL，开始爬取的页面",
            },
            maxLinks: {
                type: "number",
                description: "最多返回的链接数量（默认：10）",
                minimum: 1,
                default: 10,
            },
            filterPaths: {
                type: "array",
                items: { type: "string" },
                description: "只返回这些路径的链接（例如：['/docs/', '/guide/']）",
            },
            excludePaths: {
                type: "array",
                items: { type: "string" },
                description: "排除这些路径的链接（例如：['/contact/', '/about/']）",
            },
            timeoutMs: {
                type: "number",
                description: "请求超时时间（毫秒，默认：30000）",
                minimum: 1000,
            },
        },
    },
};
export function isCrawlSiteArgs(args) {
    return (typeof args === "object" &&
        args !== null &&
        ("url" in args && typeof args.url === "string"));
}
