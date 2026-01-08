import { Server } from "@modelcontextprotocol/sdk/server/index.js";
interface PaginationOptions {
    startChar?: number;
    maxLength?: number;
    section?: string;
    paragraphRange?: string;
    readHeadings?: boolean;
}
export declare function fetchAndConvertToMarkdown(server: Server, url: string, timeoutMs?: number, paginationOptions?: PaginationOptions, sessionId?: string): Promise<string>;
export declare function fetchCleanMarkdown(server: Server, url: string, timeoutMs?: number): Promise<string>;
export declare function fetchAndConvertToMarkdownBatch(server: Server, urls: string[], timeoutMs?: number, paginationOptions?: PaginationOptions, sessionId?: string): Promise<string>;
export {};
