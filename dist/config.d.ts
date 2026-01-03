export interface EmbeddingConfig {
    enabled: boolean;
    host: string;
    model: string;
    topK: number;
    chunkSize: number;
    chunkOverlap: number;
}
export interface CacheConfig {
    enabled: boolean;
    ttl: number;
    maxSize: number;
    searchEnabled: boolean;
    embeddingEnabled: boolean;
}
export interface FetchConfig {
    timeoutMs: number;
    enableRobotsTxt: boolean;
}
export interface ResearchConfig {
    maxKeywords: number;
    maxResultsPerKeyword: number;
    maxDescriptionLength: number;
    searchTimeoutMs: number;
}
export interface Config {
    searxngUrl: string;
    authUsername?: string;
    authPassword?: string;
    userAgent?: string;
    httpProxy?: string;
    httpsProxy?: string;
    noProxy?: string;
    embedding: EmbeddingConfig;
    cache: CacheConfig;
    fetch: FetchConfig;
    research: ResearchConfig;
}
export declare function loadConfig(): Config;
export declare function validateConfig(config: Config): string | null;
