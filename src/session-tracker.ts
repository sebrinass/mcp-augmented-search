import { loadConfig } from './config.js';

interface SessionContext {
  searchRound: number;
  urlReadRound: number;
  totalSearches: number;
  totalUrlsRead: number;
  searchedQueries: string[];
  readUrls: string[];
  sessionStartTime: number;
}

interface GlobalCache {
  searchResultsCache: Map<string, string>;
  urlContentCache: Map<string, string>;
}

class SessionTracker {
  private sessions: Map<string, SessionContext> = new Map();
  private globalCache: GlobalCache;
  private readonly maxTrackedQueries = 20;
  private readonly maxTrackedUrls = 50;
  private readonly maxResultsCacheSize = 100;
  private readonly maxContentCacheSize = 200;
  private readonly sessionCleanupIntervalMs = 30 * 60 * 1000;
  private readonly maxSessionAgeMs = 60 * 60 * 1000;

  constructor() {
    this.globalCache = {
      searchResultsCache: new Map(),
      urlContentCache: new Map(),
    };
    
    setInterval(() => this.cleanupOldSessions(), this.sessionCleanupIntervalMs);
  }

  private getOrCreateSession(sessionId: string): SessionContext {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        searchRound: 0,
        urlReadRound: 0,
        totalSearches: 0,
        totalUrlsRead: 0,
        searchedQueries: [],
        readUrls: [],
        sessionStartTime: Date.now(),
      });
    }
    return this.sessions.get(sessionId)!;
  }

  private cleanupOldSessions(): void {
    const now = Date.now();
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.sessionStartTime > this.maxSessionAgeMs) {
        this.sessions.delete(sessionId);
      }
    }
  }

  incrementSearchRound(sessionId: string): void {
    const session = this.getOrCreateSession(sessionId);
    session.searchRound += 1;
  }

  incrementUrlReadRound(sessionId: string): void {
    const session = this.getOrCreateSession(sessionId);
    session.urlReadRound += 1;
  }

  recordSearch(sessionId: string, query: string): void {
    const session = this.getOrCreateSession(sessionId);
    session.totalSearches += 1;
    const normalizedQuery = query.toLowerCase().trim().slice(0, 100);
    
    if (!session.searchedQueries.includes(normalizedQuery)) {
      session.searchedQueries.unshift(normalizedQuery);
      
      while (session.searchedQueries.length > this.maxTrackedQueries) {
        session.searchedQueries.pop();
      }
    }
  }

  recordUrlRead(sessionId: string, url: string): void {
    const session = this.getOrCreateSession(sessionId);
    session.totalUrlsRead += 1;
    
    if (!session.readUrls.includes(url)) {
      session.readUrls.unshift(url);
      
      while (session.readUrls.length > this.maxTrackedUrls) {
        session.readUrls.pop();
      }
    }
  }

  cacheSearchResults(query: string, results: string): void {
    const key = query.toLowerCase().trim().slice(0, 100);
    
    while (this.globalCache.searchResultsCache.size >= this.maxResultsCacheSize) {
      const iteratorResult = this.globalCache.searchResultsCache.keys().next();
      if (iteratorResult.done) break;
      const firstKey = iteratorResult.value;
      this.globalCache.searchResultsCache.delete(firstKey);
    }
    
    this.globalCache.searchResultsCache.set(key, results);
  }

  cacheUrlContent(url: string, content: string): void {
    while (this.globalCache.urlContentCache.size >= this.maxContentCacheSize) {
      const iteratorResult = this.globalCache.urlContentCache.keys().next();
      if (iteratorResult.done) break;
      const firstKey = iteratorResult.value;
      this.globalCache.urlContentCache.delete(firstKey);
    }
    
    this.globalCache.urlContentCache.set(url, content);
  }

  getContext(sessionId: string): SessionContext {
    return { ...this.getOrCreateSession(sessionId) };
  }

  getSearchContext(sessionId: string): string {
    const session = this.getOrCreateSession(sessionId);
    const { searchRound, totalSearches, searchedQueries } = session;
    let contextText = `【搜索进度】第 ${searchRound} 轮搜索，已完成 ${totalSearches} 次搜索\n`;
    
    if (searchedQueries.length > 0) {
      contextText += `【已搜索】${searchedQueries.slice(0, 5).join('、')}`;
      if (searchedQueries.length > 5) {
        contextText += ` 等${searchedQueries.length}个`;
      }
    }
    
    return contextText;
  }

  getUrlReadContext(sessionId: string): string {
    const session = this.getOrCreateSession(sessionId);
    const { urlReadRound, totalUrlsRead, readUrls } = session;
    let contextText = `【阅读进度】第 ${urlReadRound} 轮阅读，已读取 ${totalUrlsRead} 个页面\n`;
    
    if (readUrls.length > 0) {
      contextText += `【已阅读】${readUrls.slice(0, 3).join('、')}`;
      if (readUrls.length > 3) {
        contextText += ` 等${readUrls.length}个`;
      }
    }
    
    return contextText;
  }

  getDetailedCacheHint(sessionId: string, query: string): string {
    const session = this.getOrCreateSession(sessionId);
    const { searchedQueries, readUrls } = session;
    const normalizedQuery = query.toLowerCase().trim();
    
    let hints: string[] = [];
    let foundSearch = false;
    let foundUrl = false;
    
    for (const searched of searchedQueries) {
      if (!foundSearch && (searched.includes(normalizedQuery) || normalizedQuery.includes(searched))) {
        hints.push(`📋 已缓存搜索结果: "${searched}"`);
        foundSearch = true;
        if (this.globalCache.searchResultsCache.has(searched)) {
          const results = this.globalCache.searchResultsCache.get(searched);
          const lineCount = (results?.split('\n\n') || []).length;
          hints.push(`   → 包含 ${lineCount} 条结果，共 ${results?.length || 0} 字符`);
        }
      }
    }
    
    for (const url of readUrls) {
      if (!foundUrl && (url.includes(normalizedQuery) || normalizedQuery.includes(url))) {
        hints.push(`📄 已缓存页面内容`);
        foundUrl = true;
        if (this.globalCache.urlContentCache.has(url)) {
          const content = this.globalCache.urlContentCache.get(url);
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

  getCacheHint(sessionId: string, query: string): string {
    const session = this.getOrCreateSession(sessionId);
    const { searchedQueries, readUrls } = session;
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

  getCombinedContext(sessionId: string): string {
    const searchCtx = this.getSearchContext(sessionId);
    const urlCtx = this.getUrlReadContext(sessionId);
    const cacheHint = this.getCacheHint(sessionId, '');
    
    return [searchCtx, urlCtx, cacheHint].filter(Boolean).join('\n\n');
  }

  getSearchCacheStatus(): { size: number; maxSize: number } {
    return {
      size: this.globalCache.searchResultsCache.size,
      maxSize: this.maxResultsCacheSize,
    };
  }

  getUrlCacheStatus(): { size: number; maxSize: number } {
    return {
      size: this.globalCache.urlContentCache.size,
      maxSize: this.maxContentCacheSize,
    };
  }

  resetSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  getStats(sessionId: string): { searches: number; urls: number; round: number; uptime: number; searchCacheSize: number; urlCacheSize: number } {
    const session = this.getOrCreateSession(sessionId);
    return {
      searches: session.totalSearches,
      urls: session.totalUrlsRead,
      round: session.searchRound,
      uptime: Date.now() - session.sessionStartTime,
      searchCacheSize: this.globalCache.searchResultsCache.size,
      urlCacheSize: this.globalCache.urlContentCache.size,
    };
  }

  getSessionCount(): number {
    return this.sessions.size;
  }
}

export const sessionTracker = new SessionTracker();

export function getSearchContext(sessionId: string): string {
  return sessionTracker.getSearchContext(sessionId);
}

export function getUrlReadContext(sessionId: string): string {
  return sessionTracker.getUrlReadContext(sessionId);
}

export function getCacheHint(sessionId: string, query: string): string {
  return sessionTracker.getCacheHint(sessionId, query);
}

export function getDetailedCacheHint(sessionId: string, query: string): string {
  return sessionTracker.getDetailedCacheHint(sessionId, query);
}

export function getCombinedContext(sessionId: string): string {
  return sessionTracker.getCombinedContext(sessionId);
}

export function incrementSearchRound(sessionId: string): void {
  sessionTracker.incrementSearchRound(sessionId);
}

export function incrementUrlReadRound(sessionId: string): void {
  sessionTracker.incrementUrlReadRound(sessionId);
}

export function recordSearch(sessionId: string, query: string): void {
  sessionTracker.recordSearch(sessionId, query);
}

export function recordUrlRead(sessionId: string, url: string): void {
  sessionTracker.recordUrlRead(sessionId, url);
}

export function cacheSearchResults(query: string, results: string): void {
  sessionTracker.cacheSearchResults(query, results);
}

export function cacheUrlContent(url: string, content: string): void {
  sessionTracker.cacheUrlContent(url, content);
}

export function resetSession(sessionId: string): void {
  sessionTracker.resetSession(sessionId);
}

export function getSessionStats(sessionId: string): ReturnType<typeof sessionTracker.getStats> {
  return sessionTracker.getStats(sessionId);
}

export function getSearchCacheStatus(): { size: number; maxSize: number } {
  return sessionTracker.getSearchCacheStatus();
}

export function getUrlCacheStatus(): { size: number; maxSize: number } {
  return sessionTracker.getUrlCacheStatus();
}

export function getSessionCount(): number {
  return sessionTracker.getSessionCount();
}
