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
