import { Ollama } from 'ollama';
import { loadConfig } from './config.js';
import { getCachedEmbedding, setCachedEmbedding } from './cache.js';

export interface SearchResult {
  id: string;
  title: string;
  content: string;
  url: string;
  score: number;
}

export interface ScoredResult extends SearchResult {
  embeddingScore: number;
}

export interface SparseResult extends SearchResult {
  sparseScore: number;
}

export interface HybridResult extends SearchResult {
  sparseScore: number;
  denseScore: number;
  hybridScore: number;
}

let ollamaClient: Ollama | null = null;

function getOllamaClient(): Ollama {
  if (!ollamaClient) {
    const config = loadConfig();
    ollamaClient = new Ollama({ host: config.embedding.host });
  }
  return ollamaClient;
}

function tokenize(text: string): string[] {
  if (!text) return [];

  // Remove special characters first but keep Chinese characters and alphanumeric
  const cleanText = text.toLowerCase().replace(/[^\w\s\u4e00-\u9fa5]/g, '');

  // Use Intl.Segmenter for proper word segmentation (supports Chinese & English mixed)
  const segmenter = new Intl.Segmenter('zh-CN', { granularity: 'word' });
  const segments = segmenter.segment(cleanText);

  const tokens: string[] = [];
  for (const segment of segments) {
    if (segment.isWordLike) {
      tokens.push(segment.segment);
    }
  }

  return tokens;
}

function calculateTF(text: string, term: string): number {
  const tokens = tokenize(text);
  const termCount = tokens.filter(t => t === term).length;
  return termCount / tokens.length;
}

function calculateIDF(documents: string[], term: string): number {
  const docsWithTerm = documents.filter(doc =>
    tokenize(doc).includes(term)
  ).length;

  if (docsWithTerm === 0) return 0;

  return Math.log(documents.length / docsWithTerm);
}

export function calculateBM25(query: string, document: string, documents: string[]): number {
  const queryTerms = tokenize(query);
  const docTerms = tokenize(document);
  const docLength = docTerms.length;

  const avgDocLength = documents.reduce((sum, doc) =>
    sum + tokenize(doc).length, 0
  ) / documents.length;

  const k1 = 1.5;
  const b = 0.75;

  let score = 0;

  for (const term of queryTerms) {
    const tf = calculateTF(document, term);
    const idf = calculateIDF(documents, term);

    const numerator = tf * (k1 + 1);
    const denominator = tf + k1 * (1 - b + b * (docLength / avgDocLength));

    score += idf * (numerator / denominator);
  }

  return score;
}

export function sparseRetrieve(
  query: string,
  documents: { id: string; content: string }[],
  topK: number
): SparseResult[] {
  const docContents = documents.map(d => d.content);

  const results: SparseResult[] = documents.map(doc => ({
    id: doc.id,
    title: '',
    content: doc.content,
    url: '',
    score: 0,
    sparseScore: calculateBM25(query, doc.content, docContents)
  }));

  return results
    .sort((a, b) => b.sparseScore - a.sparseScore)
    .slice(0, topK);
}

function chunkText(text: string, chunkSize: number, chunkOverlap: number): string[] {
  if (!text) return [];

  const words = text.split(/\s+/);
  const chunks: string[] = [];

  for (let i = 0; i < words.length; i += chunkSize - chunkOverlap) {
    const chunk = words.slice(i, i + chunkSize).join(' ');
    if (chunk.trim()) {
      chunks.push(chunk);
    }
  }

  return chunks;
}

export async function getEmbedding(text: string): Promise<number[]> {
  const config = loadConfig();
  if (!config.embedding.enabled) {
    return [];
  }

  if (!text || text.trim() === '') {
    return [];
  }

  const cached = getCachedEmbedding(text);
  if (cached) {
    return cached;
  }

  try {
    const chunks = chunkText(text, config.embedding.chunkSize, config.embedding.chunkOverlap);

    if (chunks.length === 0) {
      return [];
    }

    const response = await getOllamaClient().embed({
      model: config.embedding.model,
      input: chunks,
    });

    if (response.embeddings.length === 0) {
      return [];
    }

    const embedding = response.embeddings[0];
    setCachedEmbedding(text, embedding);
    return embedding;
  } catch (error) {
    console.error('Embedding error:', error);
    return [];
  }
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) {
    return 0;
  }

  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }

  magA = Math.sqrt(magA);
  magB = Math.sqrt(magB);

  if (magA === 0 || magB === 0) {
    return 0;
  }

  return dot / (magA * magB);
}

export async function hybridRetrieve(
  query: string,
  documents: { id: string; title: string; content: string; url: string; score: number }[],
  topK: number,
  sparseWeight: number = 0.3,
  denseWeight: number = 0.7
): Promise<HybridResult[]> {
  const retrieveCount = Math.min(topK * 2, documents.length);

  const sparseResults = sparseRetrieve(query, documents, retrieveCount);
  const denseResults = await denseRetrieve(query, documents, retrieveCount);

  const sparseScoreMap = new Map(sparseResults.map(r => [r.id, r.sparseScore]));
  const denseScoreMap = new Map(denseResults.map(r => [r.id, r.denseScore]));

  const allIds = new Set([
    ...sparseResults.map(r => r.id),
    ...denseResults.map(r => r.id)
  ]);

  const hybridResults: HybridResult[] = Array.from(allIds).map(id => {
    const sparseScore = sparseScoreMap.get(id) || 0;
    const denseScore = denseScoreMap.get(id) || 0;
    const hybridScore = sparseWeight * sparseScore + denseWeight * denseScore;

    const doc = documents.find(d => d.id === id);

    return {
      id: id,
      title: doc?.title || '',
      content: doc?.content || '',
      url: doc?.url || '',
      score: hybridScore,
      sparseScore,
      denseScore,
      hybridScore
    };
  });

  return hybridResults
    .sort((a, b) => b.hybridScore - a.hybridScore)
    .slice(0, topK);
}

async function denseRetrieve(
  query: string,
  documents: { id: string; content: string }[],
  topK: number
): Promise<{ id: string; denseScore: number }[]> {
  const queryEmbedding = await getEmbedding(query);
  if (queryEmbedding.length === 0) {
    return documents.map(d => ({ id: d.id, denseScore: 0 }));
  }

  const scoredResults = await Promise.all(
    documents.map(async (doc) => {
      const resultEmbedding = await getEmbedding(doc.content);
      const denseScore = cosineSimilarity(queryEmbedding, resultEmbedding);

      return {
        id: doc.id,
        denseScore
      };
    })
  );

  return scoredResults
    .sort((a, b) => b.denseScore - a.denseScore)
    .slice(0, topK);
}

export async function rerankResults(
  query: string,
  results: SearchResult[],
  useHybrid: boolean = true,
  sparseWeight: number = 0.3,
  denseWeight: number = 0.7
): Promise<HybridResult[]> {
  const config = loadConfig();

  if (!config.embedding.enabled || results.length <= config.embedding.topK) {
    return results.map((r, i) => ({
      ...r,
      sparseScore: 0,
      denseScore: r.score,
      hybridScore: r.score
    }));
  }

  const documents = results.map((r, i) => ({
    id: `result_${i}`,
    title: r.title,
    content: r.content,
    url: r.url,
    score: r.score
  }));

  if (!useHybrid) {
    const denseResults = await denseRetrieve(query, documents, config.embedding.topK);
    return denseResults.map(d => {
      const doc = documents.find(doc => doc.id === d.id);
      return {
        id: d.id,
        title: doc?.title || '',
        content: doc?.content || '',
        url: doc?.url || '',
        score: d.denseScore,
        sparseScore: 0,
        denseScore: d.denseScore,
        hybridScore: d.denseScore
      };
    });
  }

  const hybridResults = await hybridRetrieve(
    query,
    documents,
    config.embedding.topK,
    sparseWeight,
    denseWeight
  );

  return hybridResults.map(h => ({
    id: h.id,
    title: h.title,
    content: h.content,
    url: h.url,
    score: h.hybridScore,
    sparseScore: h.sparseScore,
    denseScore: h.denseScore,
    hybridScore: h.hybridScore
  }));
}
