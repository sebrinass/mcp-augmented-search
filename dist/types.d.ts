import { Tool } from "@modelcontextprotocol/sdk/types.js";
export interface SearXNGWeb {
    results: Array<{
        title: string;
        content: string;
        url: string;
        score: number;
    }>;
}
export declare const READ_URL_TOOL: Tool;
export declare function isWebUrlReadArgs(args: unknown): args is {
    url?: string;
    urls?: string[];
    startChar?: number;
    maxLength?: number;
    section?: string;
    paragraphRange?: string;
    readHeadings?: boolean;
};
export declare const CRAWL_SITE_TOOL: Tool;
export declare function isCrawlSiteArgs(args: unknown): args is {
    url?: string;
    maxLinks?: number;
    filterPaths?: string[];
    excludePaths?: string[];
    timeoutMs?: number;
};
