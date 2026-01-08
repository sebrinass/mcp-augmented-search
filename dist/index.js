#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, SetLevelRequestSchema, ListResourcesRequestSchema, ReadResourceRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
// Import modularized functionality
import { READ_URL_TOOL } from "./types.js";
import { SEARCH_TOOL, ResearchServer } from "./research.js";
import { logMessage, setLogLevel } from "./logging.js";
import { fetchAndConvertToMarkdown, fetchAndConvertToMarkdownBatch } from "./url-reader.js";
import { createConfigResource, createHelpResource } from "./resources.js";
import { createHttpServer } from "./http-server.js";
import { validateEnvironment as validateEnv } from "./error-handler.js";
// Use a static version string that will be updated by the version script
const packageVersion = "0.8.0";
// Export the version for use in other modules
export { packageVersion };
// Global state for logging level
let currentLogLevel = "info";
// Type guard for URL reading args
export function isWebUrlReadArgs(args) {
    if (typeof args !== "object" ||
        args === null) {
        return false;
    }
    const urlArgs = args;
    // Check for either single url or urls array
    const hasSingleUrl = "url" in urlArgs && typeof urlArgs.url === "string";
    const hasUrlsArray = "urls" in urlArgs && Array.isArray(urlArgs.urls) && urlArgs.urls.every((u) => typeof u === "string");
    if (!hasSingleUrl && !hasUrlsArray) {
        return false;
    }
    // Convert empty strings to undefined for optional string parameters
    if (urlArgs.section === "")
        urlArgs.section = undefined;
    if (urlArgs.paragraphRange === "")
        urlArgs.paragraphRange = undefined;
    // Validate optional parameters
    if (urlArgs.startChar !== undefined && (typeof urlArgs.startChar !== "number" || urlArgs.startChar < 0)) {
        return false;
    }
    if (urlArgs.maxLength !== undefined && (typeof urlArgs.maxLength !== "number" || urlArgs.maxLength < 1)) {
        return false;
    }
    if (urlArgs.section !== undefined && typeof urlArgs.section !== "string") {
        return false;
    }
    if (urlArgs.paragraphRange !== undefined && typeof urlArgs.paragraphRange !== "string") {
        return false;
    }
    if (urlArgs.readHeadings !== undefined && typeof urlArgs.readHeadings !== "boolean") {
        return false;
    }
    if (urlArgs.timeoutMs !== undefined && (typeof urlArgs.timeoutMs !== "number" || urlArgs.timeoutMs < 1000)) {
        return false;
    }
    return true;
}
// Server implementation
const server = new Server({
    name: "ihor-sokoliuk/mcp-searxng",
    version: packageVersion,
}, {
    capabilities: {
        logging: {},
        resources: {},
        tools: {
            read: {
                description: READ_URL_TOOL.description,
                schema: READ_URL_TOOL.inputSchema,
            },
            search: {
                description: SEARCH_TOOL.description,
                schema: SEARCH_TOOL.inputSchema,
            },
        },
    },
});
// Initialize research server
const researchServer = new ResearchServer();
researchServer.setServer(server);
// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
    logMessage(server, "debug", "Handling list_tools request");
    return {
        tools: [SEARCH_TOOL, READ_URL_TOOL],
    };
});
// Call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const sessionId = request._meta?.sessionId || "default";
    logMessage(server, "debug", `Handling call_tool request: ${name} (session: ${sessionId})`);
    try {
        if (name === "read") {
            if (!isWebUrlReadArgs(args)) {
                logMessage(server, "error", `Read tool validation failed. Args: ${JSON.stringify(args)}`);
                throw new Error(`Invalid arguments for URL reading. Received: ${JSON.stringify(args)}`);
            }
            const paginationOptions = {
                startChar: typeof args.startChar === 'number' ? args.startChar : 0,
                maxLength: typeof args.maxLength === 'number' ? args.maxLength : undefined,
                section: typeof args.section === 'string' ? args.section : undefined,
                paragraphRange: typeof args.paragraphRange === 'string' ? args.paragraphRange : undefined,
                readHeadings: args.readHeadings === true,
            };
            let result;
            if (args.urls && Array.isArray(args.urls) && args.urls.length > 0) {
                logMessage(server, "info", `Batch URL reading: ${args.urls.length} URLs`);
                result = await fetchAndConvertToMarkdownBatch(server, args.urls, args.timeoutMs, paginationOptions, sessionId);
            }
            else {
                if (!args.url) {
                    throw new Error("Either 'url' or 'urls' parameter must be provided");
                }
                result = await fetchAndConvertToMarkdown(server, args.url, args.timeoutMs, paginationOptions, sessionId);
            }
            return {
                content: [
                    {
                        type: "text",
                        text: result,
                    },
                ],
            };
        }
        else if (name === "search") {
            // search工具现在是异步的，需要await
            const result = await researchServer.processThought(args, sessionId);
            if (result.isError) {
                throw new Error("Research tool execution failed");
            }
            return result;
        }
        else {
            throw new Error(`Unknown tool: ${name}`);
        }
    }
    catch (error) {
        logMessage(server, "error", `Tool execution error: ${error instanceof Error ? error.message : String(error)}`, {
            tool: name,
            args: args,
            error: error instanceof Error ? error.stack : String(error)
        });
        throw error;
    }
});
// Logging level handler
server.setRequestHandler(SetLevelRequestSchema, async (request) => {
    const { level } = request.params;
    logMessage(server, "info", `Setting log level to: ${level}`);
    currentLogLevel = level;
    setLogLevel(level);
    return {};
});
// List resources handler
server.setRequestHandler(ListResourcesRequestSchema, async () => {
    logMessage(server, "debug", "Handling list_resources request");
    return {
        resources: [
            {
                uri: "config://server-config",
                mimeType: "application/json",
                name: "Server Configuration",
                description: "Current server configuration and environment variables"
            },
            {
                uri: "help://usage-guide",
                mimeType: "text/markdown",
                name: "Usage Guide",
                description: "How to use the MCP SearXNG server effectively"
            }
        ]
    };
});
// Read resource handler
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;
    logMessage(server, "debug", `Handling read_resource request for: ${uri}`);
    switch (uri) {
        case "config://server-config":
            return {
                contents: [
                    {
                        uri: uri,
                        mimeType: "application/json",
                        text: createConfigResource()
                    }
                ]
            };
        case "help://usage-guide":
            return {
                contents: [
                    {
                        uri: uri,
                        mimeType: "text/markdown",
                        text: createHelpResource()
                    }
                ]
            };
        default:
            throw new Error(`Unknown resource: ${uri}`);
    }
});
// Main function
async function main() {
    // Environment validation
    const validationError = validateEnv();
    if (validationError) {
        console.error(`❌ ${validationError}`);
        process.exit(1);
    }
    // Check for HTTP transport mode
    const httpPort = process.env.MCP_HTTP_PORT;
    if (httpPort) {
        const port = parseInt(httpPort, 10);
        if (isNaN(port) || port < 1 || port > 65535) {
            console.error(`Invalid HTTP port: ${httpPort}. Must be between 1-65535.`);
            process.exit(1);
        }
        console.log(`Starting HTTP transport on port ${port}`);
        const app = await createHttpServer(server);
        const httpServer = app.listen(port, () => {
            console.log(`HTTP server listening on port ${port}`);
            console.log(`Health check: http://localhost:${port}/health`);
            console.log(`MCP endpoint: http://localhost:${port}/mcp`);
        });
        // Handle graceful shutdown
        const shutdown = (signal) => {
            console.log(`Received ${signal}. Shutting down HTTP server...`);
            httpServer.close(() => {
                console.log("HTTP server closed");
                process.exit(0);
            });
        };
        process.on('SIGINT', () => shutdown('SIGINT'));
        process.on('SIGTERM', () => shutdown('SIGTERM'));
    }
    else {
        // Default STDIO transport
        // Show helpful message when running in terminal
        if (process.stdin.isTTY) {
            console.log(`🔍 MCP SearXNG Server v${packageVersion} - Ready`);
            console.log("✅ Configuration valid");
            console.log(`🌐 SearXNG URL: ${process.env.SEARXNG_URL}`);
            console.log("📡 Waiting for MCP client connection via STDIO...\n");
        }
        const transport = new StdioServerTransport();
        await server.connect(transport);
        // Log after connection is established
        logMessage(server, "info", `MCP SearXNG Server v${packageVersion} connected via STDIO`);
        logMessage(server, "info", `Log level: ${currentLogLevel}`);
        logMessage(server, "info", `Environment: ${process.env.NODE_ENV || 'development'}`);
        logMessage(server, "info", `SearXNG URL: ${process.env.SEARXNG_URL || 'not configured'}`);
    }
}
// Handle uncaught errors
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});
// Start the server (CLI entrypoint)
main().catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
});
