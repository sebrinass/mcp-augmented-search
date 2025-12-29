import { logMessage } from "./logging.js";

export interface QueryAnalysis {
  original: string;
  transformed: string[];
  type: 'single' | 'comparative' | 'relational';
  needsSplit: boolean;
  reason: string;
}

const COMPARATIVE_PATTERNS = [
  { pattern: /^(.+?)\s*(和|与|跟|相比)\s*(.+?)\s*(区别|差异|不同|对比|比较).*$/i, name: '和...区别' },
  { pattern: /^(.+?)\s*(和|与|跟|相比)\s*(.+?)\s*(哪个|哪一个|更好|更|优劣).*$/i, name: '和...哪个' },
  { pattern: /^(.+?)\s*(对比|比较)\s*(.+?).*$/i, name: '对比...和...' },
  { pattern: /^(.+?)\s*(和|与|跟)\s*(.+?)\s*(一样|相同|相似).*$/i, name: '和...一样' },
];

const RELATIONAL_PATTERNS = [
  { pattern: /^(.+?)\s*(和|与|跟)\s*(.+?)\s*(关系|关联|联系).*$/i, name: '和...关系' },
];

export function analyzeQuery(query: string): QueryAnalysis {
  const normalizedQuery = query.trim();
  
  for (const { pattern } of COMPARATIVE_PATTERNS) {
    const match = normalizedQuery.match(pattern);
    if (match) {
      const entityA = match[1].trim();
      const entityB = match[3].trim();
      
      const queries = [
        `${entityA} 是什么 特色 举办时间`,
        `${entityB} 是什么 特色 举办时间`,
      ];
      
      return {
        original: query,
        transformed: queries,
        type: 'comparative',
        needsSplit: true,
        reason: `检测到比较类问题 "${match[0]}"，拆分为独立实体搜索以提高相关性`,
      };
    }
  }
  
  for (const { pattern } of RELATIONAL_PATTERNS) {
    const match = normalizedQuery.match(pattern);
    if (match) {
      const entityA = match[1].trim();
      const entityB = match[3].trim();
      
      const queries = [
        `${entityA} 是什么 举办时间`,
        `${entityB} 是什么 举办时间`,
      ];
      
      return {
        original: query,
        transformed: queries,
        type: 'relational',
        needsSplit: true,
        reason: `检测到关联类问题 "${match[0]}"，拆分为独立实体搜索`,
      };
    }
  }
  
  return {
    original: query,
    transformed: [query],
    type: 'single',
    needsSplit: false,
    reason: '单问题直接搜索',
  };
}

export function splitComparativeQuery(query: string): string[] {
  const analysis = analyzeQuery(query);
  return analysis.transformed;
}

export function shouldSplitQuery(query: string): boolean {
  const analysis = analyzeQuery(query);
  return analysis.needsSplit;
}

export function getQueryType(query: string): 'single' | 'comparative' | 'relational' {
  return analyzeQuery(query).type;
}
