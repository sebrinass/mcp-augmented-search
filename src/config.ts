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
}

function getEnv(key: string, defaultValue?: string): string | undefined {
  return process.env[key] ?? defaultValue;
}

function getEnvBoolean(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  return value === 'true' || value === '1';
}

function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

export function loadConfig(): Config {
  return {
    searxngUrl: getEnv('SEARXNG_URL', 'http://localhost:8080')?.replace(/\/$/, '') || '',
    authUsername: getEnv('AUTH_USERNAME'),
    authPassword: getEnv('AUTH_PASSWORD'),
    userAgent: getEnv('USER_AGENT'),
    httpProxy: getEnv('HTTP_PROXY'),
    httpsProxy: getEnv('HTTPS_PROXY'),
    noProxy: getEnv('NO_PROXY'),
    embedding: {
      enabled: getEnvBoolean('ENABLE_EMBEDDING', true),
      host: getEnv('OLLAMA_HOST', 'http://localhost:11434') || 'http://localhost:11434',
      model: getEnv('EMBEDDING_MODEL', 'nomic-embed-text') || 'nomic-embed-text',
      topK: getEnvNumber('TOP_K', 3),
      chunkSize: getEnvNumber('CHUNK_SIZE', 1000),
      chunkOverlap: getEnvNumber('CHUNK_OVERLAP', 100),
    },
    cache: {
      enabled: getEnvBoolean('ENABLE_CACHE', true),
      ttl: getEnvNumber('CACHE_TTL', 300),
      maxSize: getEnvNumber('CACHE_MAX_SIZE', 1000),
      searchEnabled: getEnvBoolean('CACHE_SEARCH', true),
      embeddingEnabled: getEnvBoolean('CACHE_EMBEDDING', true),
    },
    fetch: {
      timeoutMs: getEnvNumber('FETCH_TIMEOUT_MS', 30000),
      enableRobotsTxt: getEnvBoolean('ENABLE_ROBOTS_TXT', false),
    },
  };
}

export function validateConfig(config: Config): string | null {
  if (!config.searxngUrl) {
    return 'SEARXNG_URL is required';
  }
  try {
    new URL(config.searxngUrl);
  } catch {
    return 'SEARXNG_URL is not a valid URL';
  }
  if (config.embedding.enabled) {
    try {
      new URL(config.embedding.host);
    } catch {
      return 'OLLAMA_HOST is not a valid URL';
    }
  }
  return null;
}
