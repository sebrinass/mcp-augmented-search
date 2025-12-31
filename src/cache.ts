import { loadConfig } from './config.js';
import { getEmbedding, cosineSimilarity, calculateBM25 } from './embedding.js';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  hits: number;
}

interface SearchCacheEntry {
  results: Array<{ title: string; content: string; url: string; score: number }>;
  timestamp: number;
  hits: number;
}

interface UrlCacheEntry {
  htmlContent: string;
  markdownContent: string;
  timestamp: number;
}

class SessionDeduplication {
  private recentSearches: Map<string, { timestamp: number; results: SearchCacheEntry['results'] | null }> = new Map();
  private readonly maxRecentSearches = 100;
  private readonly dedupWindowMs = 5 * 60 * 1000;

  private getCacheKey(text: string): string {
    return text.toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 200);
  }

  isDuplicate(query: string): boolean {
    const key = this.getCacheKey(query);
    const entry = this.recentSearches.get(key);
    
    if (!entry) {
      return false;
    }

    const isWithinWindow = Date.now() - entry.timestamp < this.dedupWindowMs;
    
    if (isWithinWindow) {
      return true;
    } else {
      this.recentSearches.delete(key);
      return false;
    }
  }

  getDuplicateResult(query: string): SearchCacheEntry['results'] | null {
    const key = this.getCacheKey(query);
    const entry = this.recentSearches.get(key);
    
    if (!entry) {
      return null;
    }

    const isWithinWindow = Date.now() - entry.timestamp < this.dedupWindowMs;
    
    if (isWithinWindow && entry.results) {
      return entry.results;
    }
    
    if (!isWithinWindow) {
      this.recentSearches.delete(key);
    }
    
    return null;
  }

  markSearched(query: string, results: SearchCacheEntry['results'] | null): void {
    const key = this.getCacheKey(query);
    
    this.recentSearches.set(key, {
      timestamp: Date.now(),
      results
    });

    while (this.recentSearches.size > this.maxRecentSearches) {
      const oldestKey = this.findOldestKey();
      if (oldestKey) {
        this.recentSearches.delete(oldestKey);
      }
    }
  }

  private findOldestKey(): string | null {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.recentSearches) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  clear(): void {
    this.recentSearches.clear();
  }

  getStats(): { size: number; maxSize: number } {
    return {
      size: this.recentSearches.size,
      maxSize: this.maxRecentSearches
    };
  }
}

class SemanticSearchCache {
  private semanticCache: Map<string, { query: string; embedding: number[]; results: SearchCacheEntry['results']; timestamp: number }> = new Map();
  private readonly maxEntries = 50;
  private readonly similarityThreshold = 0.95;
  private readonly ttlMs = 30 * 60 * 1000;

  private getCacheKey(text: string): string {
    return text.toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 100);
  }

  private isExpired(timestamp: number): boolean {
    return Date.now() - timestamp > this.ttlMs;
  }

  async findSimilar(query: string): Promise<SearchCacheEntry['results'] | null> {
    const config = loadConfig();
    if (!config.embedding.enabled) {
      return null;
    }

    const queryEmbedding = await getEmbedding(query);
    if (queryEmbedding.length === 0) {
      return null;
    }

    const cachedDocuments = Array.from(this.semanticCache.entries())
      .filter(([key, entry]) => !this.isExpired(entry.timestamp))
      .map(([key, entry]) => entry.query);

    let bestMatch: { key: string; similarity: number; entry: any } | null = null;
    let bestSimilarity = this.similarityThreshold;

    for (const [key, entry] of this.semanticCache) {
      if (this.isExpired(entry.timestamp)) {
        this.semanticCache.delete(key);
        continue;
      }

      if (!entry.embedding || entry.embedding.length !== queryEmbedding.length) {
        continue;
      }

      const bm25Score = calculateBM25(query, entry.query, cachedDocuments);
      const embeddingScore = cosineSimilarity(queryEmbedding, entry.embedding);
      const hybridScore = 0.7 * bm25Score + 0.3 * embeddingScore;

      if (hybridScore > bestSimilarity) {
        bestSimilarity = hybridScore;
        bestMatch = { key, similarity: hybridScore, entry };
      }
    }

    if (bestMatch) {
      bestMatch.entry.timestamp = Date.now();
      return bestMatch.entry.results;
    }

    return null;
  }

  async set(query: string, results: SearchCacheEntry['results']): Promise<void> {
    const config = loadConfig();
    if (!config.embedding.enabled) {
      return;
    }

    const queryEmbedding = await getEmbedding(query);
    if (queryEmbedding.length === 0) {
      return;
    }

    const cacheKey = this.getCacheKey(query);

    if (this.semanticCache.has(cacheKey)) {
      const entry = this.semanticCache.get(cacheKey)!;
      entry.query = query;
      entry.embedding = queryEmbedding;
      entry.results = results;
      entry.timestamp = Date.now();
      return;
    }

    while (this.semanticCache.size >= this.maxEntries) {
      let oldestKey: string | null = null;
      let oldestTime = Infinity;

      for (const [key, entry] of this.semanticCache) {
        if (entry.timestamp < oldestTime) {
          oldestTime = entry.timestamp;
          oldestKey = key;
        }
      }

      if (oldestKey) {
        this.semanticCache.delete(oldestKey);
      } else {
        break;
      }
    }

    if (this.semanticCache.size < this.maxEntries) {
      this.semanticCache.set(cacheKey, {
        query,
        embedding: queryEmbedding,
        results,
        timestamp: Date.now()
      });
    }
  }

  clear(): void {
    this.semanticCache.clear();
  }

  getStats(): { size: number; maxSize: number } {
    return {
      size: this.semanticCache.size,
      maxSize: this.maxEntries
    };
  }
}

class UrlMemoryCache {
  private urlCache: Map<string, UrlCacheEntry> = new Map();
  private config = loadConfig().cache;
  private totalSize = 0;

  private shouldEvict(): boolean {
    return this.totalSize > this.config.maxSize;
  }

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.urlCache) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.urlCache.delete(oldestKey);
      this.totalSize -= 1;
    }
  }

  private isExpired(timestamp: number): boolean {
    return Date.now() - timestamp > this.config.ttl * 1000;
  }

  get(url: string): { htmlContent: string; markdownContent: string } | null {
    if (!this.config.enabled) {
      return null;
    }

    const entry = this.urlCache.get(url);

    if (!entry) {
      return null;
    }

    if (this.isExpired(entry.timestamp)) {
      this.urlCache.delete(url);
      this.totalSize -= 1;
      return null;
    }

    return {
      htmlContent: entry.htmlContent,
      markdownContent: entry.markdownContent
    };
  }

  set(url: string, htmlContent: string, markdownContent: string): void {
    if (!this.config.enabled) {
      return;
    }

    if (this.urlCache.has(url)) {
      const entry = this.urlCache.get(url)!;
      entry.htmlContent = htmlContent;
      entry.markdownContent = markdownContent;
      entry.timestamp = Date.now();
      return;
    }

    while (this.shouldEvict() && this.totalSize > 0) {
      this.evictOldest();
    }

    if (this.totalSize < this.config.maxSize) {
      this.urlCache.set(url, {
        htmlContent,
        markdownContent,
        timestamp: Date.now()
      });
      this.totalSize += 1;
    }
  }

  clear(): void {
    this.urlCache.clear();
    this.totalSize = 0;
  }
}

class MemoryCache {
  private searchCache: Map<string, SearchCacheEntry> = new Map();
  private embeddingCache: Map<string, CacheEntry<number[]>> = new Map();
  private config = loadConfig().cache;
  private totalSize = 0;

  private getCacheKey(text: string): string {
    return text.toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 200);
  }

  private shouldEvict(): boolean {
    return this.totalSize > this.config.maxSize;
  }

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    let minHits = Infinity;
    let evictKey: string | null = null;

    for (const [key, entry] of this.searchCache) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
      if (entry.hits < minHits) {
        minHits = entry.hits;
        evictKey = key;
      }
    }

    for (const [key, entry] of this.embeddingCache) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
      if (entry.hits < minHits) {
        minHits = entry.hits;
        evictKey = key;
      }
    }

    if (evictKey) {
      if (this.searchCache.has(evictKey)) {
        this.searchCache.delete(evictKey);
        this.totalSize -= 1;
      } else if (this.embeddingCache.has(evictKey)) {
        this.embeddingCache.delete(evictKey);
        this.totalSize -= 1;
      }
    }
  }

  private isExpired(timestamp: number): boolean {
    return Date.now() - timestamp > this.config.ttl * 1000;
  }

  getSearch(query: string): SearchCacheEntry | null {
    if (!this.config.enabled || !this.config.searchEnabled) {
      return null;
    }

    const key = this.getCacheKey(query);
    const entry = this.searchCache.get(key);

    if (!entry) {
      return null;
    }

    if (this.isExpired(entry.timestamp)) {
      this.searchCache.delete(key);
      this.totalSize -= 1;
      return null;
    }

    entry.hits += 1;
    return entry;
  }

  setSearch(query: string, results: SearchCacheEntry['results']): void {
    if (!this.config.enabled || !this.config.searchEnabled) {
      return;
    }

    const key = this.getCacheKey(query);

    if (this.searchCache.has(key)) {
      const entry = this.searchCache.get(key)!;
      entry.results = results;
      entry.timestamp = Date.now();
      entry.hits += 1;
      return;
    }

    while (this.shouldEvict() && this.totalSize > 0) {
      this.evictOldest();
    }

    if (this.totalSize < this.config.maxSize) {
      this.searchCache.set(key, {
        results,
        timestamp: Date.now(),
        hits: 1,
      });
      this.totalSize += 1;
    }
  }

  getEmbedding(text: string): number[] | null {
    if (!this.config.enabled || !this.config.embeddingEnabled) {
      return null;
    }

    const key = this.getCacheKey(text);
    const entry = this.embeddingCache.get(key);

    if (!entry) {
      return null;
    }

    if (this.isExpired(entry.timestamp)) {
      this.embeddingCache.delete(key);
      this.totalSize -= 1;
      return null;
    }

    entry.hits += 1;
    return entry.data;
  }

  setEmbedding(text: string, embedding: number[]): void {
    if (!this.config.enabled || !this.config.embeddingEnabled) {
      return;
    }

    const key = this.getCacheKey(text);

    if (this.embeddingCache.has(key)) {
      const entry = this.embeddingCache.get(key)!;
      entry.data = embedding;
      entry.timestamp = Date.now();
      entry.hits += 1;
      return;
    }

    while (this.shouldEvict() && this.totalSize > 0) {
      this.evictOldest();
    }

    if (this.totalSize < this.config.maxSize) {
      this.embeddingCache.set(key, {
        data: embedding,
        timestamp: Date.now(),
        hits: 1,
      });
      this.totalSize += 1;
    }
  }

  clear(): void {
    this.searchCache.clear();
    this.embeddingCache.clear();
    this.totalSize = 0;
  }

  getStats(): { searchSize: number; embeddingSize: number; totalSize: number; hits: number } {
    let totalHits = 0;
    for (const entry of this.searchCache.values()) {
      totalHits += entry.hits;
    }
    for (const entry of this.embeddingCache.values()) {
      totalHits += entry.hits;
    }

    return {
      searchSize: this.searchCache.size,
      embeddingSize: this.embeddingCache.size,
      totalSize: this.totalSize,
      hits: totalHits,
    };
  }
}

export const urlCache = new UrlMemoryCache();
export const cache = new MemoryCache();
export const sessionDedup = new SessionDeduplication();

export function getCachedEmbedding(text: string): number[] | null {
  return cache.getEmbedding(text);
}

export function setCachedEmbedding(text: string, embedding: number[]): void {
  cache.setEmbedding(text, embedding);
}

export function getCachedSearch(query: string): SearchCacheEntry | null {
  return cache.getSearch(query);
}

export function setCachedSearch(query: string, results: SearchCacheEntry['results']): void {
  cache.setSearch(query, results);
}

export function isSearchDuplicate(query: string): boolean {
  return sessionDedup.isDuplicate(query);
}

export function getDuplicateSearchResult(query: string): SearchCacheEntry['results'] | null {
  return sessionDedup.getDuplicateResult(query);
}

export function markSearchPerformed(query: string, results: SearchCacheEntry['results'] | null): void {
  sessionDedup.markSearched(query, results);
}

export function clearSessionDedup(): void {
  sessionDedup.clear();
}

export function getSessionDedupStats(): ReturnType<typeof sessionDedup.getStats> {
  return sessionDedup.getStats();
}

export function clearCache(): void {
  cache.clear();
}

export function getCacheStats(): ReturnType<typeof cache.getStats> {
  return cache.getStats();
}

export const semanticCache = new SemanticSearchCache();

export async function findSimilarSearch(query: string): Promise<SearchCacheEntry['results'] | null> {
  return semanticCache.findSimilar(query);
}

export async function setSimilarSearch(query: string, results: SearchCacheEntry['results']): Promise<void> {
  return semanticCache.set(query, results);
}

export function clearSemanticCache(): void {
  semanticCache.clear();
}

export function getSemanticCacheStats(): ReturnType<typeof semanticCache.getStats> {
  return semanticCache.getStats();
}
