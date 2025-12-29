import { loadConfig } from './config.js';

interface SessionContext {
  searchRound: number;
  urlReadRound: number;
  totalSearches: number;
  totalUrlsRead: number;
  searchedQueries: string[];
  readUrls: string[];
  sessionStartTime: number;
  searchResultsCache: Map<string, string>;
  urlContentCache: Map<string, string>;
}

class SessionTracker {
  private context: SessionContext;
  private readonly maxTrackedQueries = 20;
  private readonly maxTrackedUrls = 50;
  private readonly maxResultsCacheSize = 100;
  private readonly maxContentCacheSize = 200;

  constructor() {
    this.context = {
      searchRound: 0,
      urlReadRound: 0,
      totalSearches: 0,
      totalUrlsRead: 0,
      searchedQueries: [],
      readUrls: [],
      sessionStartTime: Date.now(),
      searchResultsCache: new Map(),
      urlContentCache: new Map(),
    };
  }

  incrementSearchRound(): void {
    this.context.searchRound += 1;
  }

  incrementUrlReadRound(): void {
    this.context.urlReadRound += 1;
  }

  recordSearch(query: string): void {
    this.context.totalSearches += 1;
    const normalizedQuery = query.toLowerCase().trim().slice(0, 100);
    
    if (!this.context.searchedQueries.includes(normalizedQuery)) {
      this.context.searchedQueries.unshift(normalizedQuery);
      
      while (this.context.searchedQueries.length > this.maxTrackedQueries) {
        this.context.searchedQueries.pop();
      }
    }
  }

  recordUrlRead(url: string): void {
    this.context.totalUrlsRead += 1;
    
    if (!this.context.readUrls.includes(url)) {
      this.context.readUrls.unshift(url);
      
      while (this.context.readUrls.length > this.maxTrackedUrls) {
        this.context.readUrls.pop();
      }
    }
  }

  cacheSearchResults(query: string, results: string): void {
    const key = query.toLowerCase().trim().slice(0, 100);
    
    while (this.context.searchResultsCache.size >= this.maxResultsCacheSize) {
      const iteratorResult = this.context.searchResultsCache.keys().next();
      if (iteratorResult.done) break;
      const firstKey = iteratorResult.value;
      this.context.searchResultsCache.delete(firstKey);
    }
    
    this.context.searchResultsCache.set(key, results);
  }

  cacheUrlContent(url: string, content: string): void {
    while (this.context.urlContentCache.size >= this.maxContentCacheSize) {
      const iteratorResult = this.context.urlContentCache.keys().next();
      if (iteratorResult.done) break;
      const firstKey = iteratorResult.value;
      this.context.urlContentCache.delete(firstKey);
    }
    
    this.context.urlContentCache.set(url, content);
  }

  getContext(): SessionContext {
    return { ...this.context };
  }

  getSearchContext(): string {
    const { searchRound, totalSearches, searchedQueries } = this.context;
    let contextText = `【搜索进度】第 ${searchRound} 轮搜索，已完成 ${totalSearches} 次搜索\n`;
    
    if (searchedQueries.length > 0) {
      contextText += `【已搜索】${searchedQueries.slice(0, 5).join('、')}`;
      if (searchedQueries.length > 5) {
        contextText += ` 等${searchedQueries.length}个`;
      }
    }
    
    return contextText;
  }

  getUrlReadContext(): string {
    const { urlReadRound, totalUrlsRead, readUrls } = this.context;
    let contextText = `【阅读进度】第 ${urlReadRound} 轮阅读，已读取 ${totalUrlsRead} 个页面\n`;
    
    if (readUrls.length > 0) {
      contextText += `【已阅读】${readUrls.slice(0, 3).join('、')}`;
      if (readUrls.length > 3) {
        contextText += ` 等${readUrls.length}个`;
      }
    }
    
    return contextText;
  }

  getDetailedCacheHint(query: string): string {
    const { searchedQueries, readUrls, searchResultsCache, urlContentCache } = this.context;
    const normalizedQuery = query.toLowerCase().trim();
    
    let hints: string[] = [];
    let foundSearch = false;
    let foundUrl = false;
    
    for (const searched of searchedQueries) {
      if (!foundSearch && (searched.includes(normalizedQuery) || normalizedQuery.includes(searched))) {
        hints.push(`📋 已缓存搜索结果: "${searched}"`);
        foundSearch = true;
        if (searchResultsCache.has(searched)) {
          const results = searchResultsCache.get(searched);
          const lineCount = (results?.split('\n\n') || []).length;
          hints.push(`   → 包含 ${lineCount} 条结果，共 ${results?.length || 0} 字符`);
        }
      }
    }
    
    for (const url of readUrls) {
      if (!foundUrl && (url.includes(normalizedQuery) || normalizedQuery.includes(url))) {
        hints.push(`📄 已缓存页面内容`);
        foundUrl = true;
        if (urlContentCache.has(url)) {
          const content = urlContentCache.get(url);
          hints.push(`   → ${content?.length || 0} 字符`);
        }
        break;
      }
    }
    
    if (!foundSearch && !foundUrl) {
      for (const searched of searchedQueries.slice(0, 3)) {
        const similarity = this.calculateStringSimilarity(normalizedQuery, searched);
        if (similarity > 0.6) {
          hints.push(`💡 相关搜索历史: "${searched}" (相似度: ${(similarity * 100).toFixed(0)}%)`);
          break;
        }
      }
    }
    
    return hints.length > 0 ? hints.join('\n') : '';
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    
    if (s1 === s2) return 1.0;
    if (s1.length === 0 || s2.length === 0) return 0.0;
    
    const words1 = new Set(s1.split(/\s+/));
    const words2 = new Set(s2.split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    if (union.size === 0) return 0.0;
    
    return intersection.size / union.size;
  }

  getCacheHint(query: string): string {
    const { searchedQueries, readUrls } = this.context;
    const normalizedQuery = query.toLowerCase().trim();
    
    let hints: string[] = [];
    
    for (const searched of searchedQueries) {
      if (searched.includes(normalizedQuery) || normalizedQuery.includes(searched)) {
        hints.push(`之前搜索过类似问题: "${searched}"`);
        break;
      }
    }
    
    for (const url of readUrls) {
      if (url.includes(normalizedQuery) || normalizedQuery.includes(url)) {
        hints.push(`之前阅读过相关页面`);
        break;
      }
    }
    
    return hints.length > 0 ? hints.join('\n') : '';
  }

  getCombinedContext(): string {
    const searchCtx = this.getSearchContext();
    const urlCtx = this.getUrlReadContext();
    const cacheHint = this.getCacheHint('');
    
    return [searchCtx, urlCtx, cacheHint].filter(Boolean).join('\n\n');
  }

  getSearchCacheStatus(): { size: number; maxSize: number } {
    return {
      size: this.context.searchResultsCache.size,
      maxSize: this.maxResultsCacheSize,
    };
  }

  getUrlCacheStatus(): { size: number; maxSize: number } {
    return {
      size: this.context.urlContentCache.size,
      maxSize: this.maxContentCacheSize,
    };
  }

  reset(): void {
    this.context = {
      searchRound: 0,
      urlReadRound: 0,
      totalSearches: 0,
      totalUrlsRead: 0,
      searchedQueries: [],
      readUrls: [],
      sessionStartTime: Date.now(),
      searchResultsCache: new Map(),
      urlContentCache: new Map(),
    };
  }

  getStats(): { searches: number; urls: number; round: number; uptime: number; searchCacheSize: number; urlCacheSize: number } {
    return {
      searches: this.context.totalSearches,
      urls: this.context.totalUrlsRead,
      round: this.context.searchRound,
      uptime: Date.now() - this.context.sessionStartTime,
      searchCacheSize: this.context.searchResultsCache.size,
      urlCacheSize: this.context.urlContentCache.size,
    };
  }
}

export const sessionTracker = new SessionTracker();

export function getSearchContext(): string {
  return sessionTracker.getSearchContext();
}

export function getUrlReadContext(): string {
  return sessionTracker.getUrlReadContext();
}

export function getCacheHint(query: string): string {
  return sessionTracker.getCacheHint(query);
}

export function getDetailedCacheHint(query: string): string {
  return sessionTracker.getDetailedCacheHint(query);
}

export function getCombinedContext(): string {
  return sessionTracker.getCombinedContext();
}

export function incrementSearchRound(): void {
  sessionTracker.incrementSearchRound();
}

export function incrementUrlReadRound(): void {
  sessionTracker.incrementUrlReadRound();
}

export function recordSearch(query: string): void {
  sessionTracker.recordSearch(query);
}

export function recordUrlRead(url: string): void {
  sessionTracker.recordUrlRead(url);
}

export function cacheSearchResults(query: string, results: string): void {
  sessionTracker.cacheSearchResults(query, results);
}

export function cacheUrlContent(url: string, content: string): void {
  sessionTracker.cacheUrlContent(url, content);
}

export function resetSession(): void {
  sessionTracker.reset();
}

export function getSessionStats(): ReturnType<typeof sessionTracker.getStats> {
  return sessionTracker.getStats();
}

export function getSearchCacheStatus(): { size: number; maxSize: number } {
  return sessionTracker.getSearchCacheStatus();
}

export function getUrlCacheStatus(): { size: number; maxSize: number } {
  return sessionTracker.getUrlCacheStatus();
}
