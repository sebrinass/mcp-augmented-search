import { Server } from "@modelcontextprotocol/sdk/server/index.js";
export interface SearchResult {
    id: string;
    title: string;
    content: string;
    url: string;
    score: number;
}
export interface ScoredResult extends SearchResult {
    similarity: number;
}
export declare function performWebSearch(server: Server, query: string, pageno?: number, time_range?: string, language?: string, safesearch?: string, site?: string, sessionId?: string): Promise<string>;
