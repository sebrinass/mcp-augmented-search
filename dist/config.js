function getEnv(key, defaultValue) {
    return process.env[key] ?? defaultValue;
}
function getEnvBoolean(key, defaultValue) {
    const value = process.env[key];
    if (value === undefined)
        return defaultValue;
    return value === 'true' || value === '1';
}
function getEnvNumber(key, defaultValue) {
    const value = process.env[key];
    if (value === undefined)
        return defaultValue;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
}
export function loadConfig() {
    return {
        searxngUrl: getEnv('SEARXNG_URL', 'http://localhost:8080')?.replace(/\/$/, '') || '',
        authUsername: getEnv('AUTH_USERNAME'),
        authPassword: getEnv('AUTH_PASSWORD'),
        userAgent: getEnv('USER_AGENT'),
        httpProxy: getEnv('HTTP_PROXY'),
        httpsProxy: getEnv('HTTPS_PROXY'),
        noProxy: getEnv('NO_PROXY'),
        embedding: {
            enabled: getEnvBoolean('ENABLE_EMBEDDING', false),
            host: getEnv('OLLAMA_HOST', 'http://localhost:11434') || 'http://localhost:11434',
            model: getEnv('EMBEDDING_MODEL', 'nomic-embed-text') || 'nomic-embed-text',
            topK: getEnvNumber('TOP_K', 3),
            chunkSize: getEnvNumber('CHUNK_SIZE', 1000),
            chunkOverlap: getEnvNumber('CHUNK_OVERLAP', 100),
        },
        cache: {
            enabled: getEnvBoolean('ENABLE_CACHE', false),
            ttl: getEnvNumber('CACHE_TTL', 300),
            maxSize: getEnvNumber('CACHE_MAX_SIZE', 1000),
            searchEnabled: getEnvBoolean('CACHE_SEARCH', false),
            embeddingEnabled: getEnvBoolean('CACHE_EMBEDDING', false),
        },
        fetch: {
            timeoutMs: getEnvNumber('FETCH_TIMEOUT_MS', 30000),
            enableRobotsTxt: getEnvBoolean('ENABLE_ROBOTS_TXT', false),
            blockVideoSites: getEnvBoolean('BLOCK_VIDEO_SITES', false),
            videoBlocklist: (getEnv('VIDEO_BLOCKLIST', '') || '').split(',').map(s => s.trim()).filter(Boolean),
        },
        research: {
            maxKeywords: getEnvNumber('MAX_KEYWORDS', 5),
            maxDescriptionLength: getEnvNumber('MAX_DESCRIPTION_LENGTH', 300),
            searchTimeoutMs: getEnvNumber('RESEARCH_SEARCH_TIMEOUT_MS', 10000),
        },
    };
}
export function validateConfig(config) {
    if (!config.searxngUrl) {
        return 'SEARXNG_URL is required';
    }
    try {
        new URL(config.searxngUrl);
    }
    catch {
        return 'SEARXNG_URL is not a valid URL';
    }
    if (config.embedding.enabled) {
        try {
            new URL(config.embedding.host);
        }
        catch {
            return 'OLLAMA_HOST is not a valid URL';
        }
    }
    return null;
}
