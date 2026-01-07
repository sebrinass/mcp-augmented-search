import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { loadConfig } from "./config.js";
import { logMessage } from "./logging.js";
import { performWebSearch } from "./search.js";

// 单个搜索结果的接口
export interface SearchResultItem {
  title: string;
  url: string;
  description: string;
  relevance: number;
}

// 每个关键词的搜索结果
export interface KeywordSearchResult {
  keyword: string;
  cached: boolean;
  matchedKeyword?: string;  // 如果命中语义缓存，显示原搜索词
  resultCount: number;
  results: SearchResultItem[];
  error?: string;
}

// research 工具的输入参数
export interface ThoughtData {
  thought: string;
  thoughtNumber: number;
  totalThoughts: number;
  isRevision?: boolean;
  revisesThought?: number;
  branchFromThought?: number;
  branchId?: string;
  needsMoreThoughts?: boolean;
  nextThoughtNeeded: boolean;
  informationSummary?: string;
  searchedKeywords?: string[];
  site?: string;
}

// research 工具的返回结果
export interface ResearchResult {
  thoughtStatus: {
    thoughtNumber: number;
    totalThoughts: number;
    nextThoughtNeeded: boolean;
    thoughtHistoryLength: number;
    branches: string[];
  };
  searchResults?: KeywordSearchResult[];
  message?: string;
}

export class ResearchServer {
  private thoughtHistory: ThoughtData[] = [];
  private branches: Record<string, ThoughtData[]> = {};
  private server: Server | null = null;

  // 设置 server 实例（用于日志和搜索）
  public setServer(server: Server): void {
    this.server = server;
  }

  // 解析搜索结果文本，提取结构化数据
  private parseSearchResultText(resultText: string, maxDescriptionLength: number): SearchResultItem[] {
    const results: SearchResultItem[] = [];

    // 搜索结果格式：Title: xxx\nDescription: xxx\nURL: xxx\nRelevance Score: xxx
    const lines = resultText.split('\n');
    let currentResult: Partial<SearchResultItem> = {};

    for (const line of lines) {
      if (line.startsWith('Title: ')) {
        // 如果有上一个结果，保存它
        if (currentResult.title && currentResult.url) {
          results.push(currentResult as SearchResultItem);
        }
        currentResult = { title: line.substring(7) };
      } else if (line.startsWith('Description: ')) {
        let desc = line.substring(13);
        // 限制描述长度
        if (desc.length > maxDescriptionLength) {
          desc = desc.substring(0, maxDescriptionLength) + '...';
        }
        currentResult.description = desc;
      } else if (line.startsWith('URL: ')) {
        // 移除可能的警告标记
        let url = line.substring(5);
        const warningIndex = url.indexOf(' ⚠️');
        if (warningIndex > -1) {
          url = url.substring(0, warningIndex);
        }
        currentResult.url = url;
      } else if (line.startsWith('Relevance Score: ')) {
        currentResult.relevance = parseFloat(line.substring(17)) || 0;
      }
    }

    // 保存最后一个结果
    if (currentResult.title && currentResult.url) {
      results.push(currentResult as SearchResultItem);
    }

    return results;
  }

  // 执行单个关键词搜索
  private async searchKeyword(keyword: string, sessionId: string, maxDescriptionLength: number, site?: string): Promise<KeywordSearchResult> {
    if (!this.server) {
      return {
        keyword,
        cached: false,
        resultCount: 0,
        results: [],
        error: "Server not initialized"
      };
    }

    try {
      const resultText = await performWebSearch(
        this.server,
        keyword,
        1,           // pageno
        undefined,   // time_range
        "all",       // language
        "0",         // safesearch
        site,
        sessionId
      );

      // 检测是否命中缓存
      const cached = resultText.includes('【缓存命中】') ||
        resultText.includes('【语义缓存命中】') ||
        resultText.includes('【磁盘缓存命中】');

      // 解析搜索结果（performWebSearch 已经用 TOP_K 限制了结果数量）
      const results = this.parseSearchResultText(resultText, maxDescriptionLength);

      return {
        keyword,
        cached,
        resultCount: results.length,
        results
      };
    } catch (error: any) {
      logMessage(this.server, "error", `Search failed for keyword "${keyword}": ${error.message}`);
      return {
        keyword,
        cached: false,
        resultCount: 0,
        results: [],
        error: error.message || "搜索失败"
      };
    }
  }

  // 并发执行多个关键词搜索
  private async searchKeywords(
    keywords: string[],
    sessionId: string,
    maxKeywords: number,
    maxDescriptionLength: number,
    timeoutMs: number,
    site?: string
  ): Promise<KeywordSearchResult[]> {
    // 限制关键词数量
    const limitedKeywords = keywords.slice(0, maxKeywords);

    // 去重
    const uniqueKeywords = [...new Set(limitedKeywords)];

    if (uniqueKeywords.length === 0) {
      return [];
    }

    if (this.server) {
      logMessage(this.server, "info", `Research: 开始并发搜索 ${uniqueKeywords.length} 个关键词`);
    }

    // 创建带超时的 Promise
    const searchWithTimeout = async (keyword: string): Promise<KeywordSearchResult> => {
      const timeoutPromise = new Promise<KeywordSearchResult>((_, reject) => {
        setTimeout(() => reject(new Error('搜索超时')), timeoutMs);
      });

      const searchPromise = this.searchKeyword(keyword, sessionId, maxDescriptionLength, site);

      try {
        return await Promise.race([searchPromise, timeoutPromise]);
      } catch (error: any) {
        return {
          keyword,
          cached: false,
          resultCount: 0,
          results: [],
          error: error.message || '搜索超时'
        };
      }
    };

    // 并发执行所有搜索
    const results = await Promise.all(uniqueKeywords.map(kw => searchWithTimeout(kw)));

    if (this.server) {
      const successCount = results.filter(r => !r.error).length;
      logMessage(this.server, "info", `Research: 搜索完成，成功 ${successCount}/${uniqueKeywords.length}`);
    }

    return results;
  }

  // 主处理方法
  public async processThought(
    input: ThoughtData,
    sessionId: string = "default"
  ): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
    try {
      const config = loadConfig();
      const researchConfig = config.research;

      // 调整总步骤数
      if (input.thoughtNumber > input.totalThoughts) {
        input.totalThoughts = input.thoughtNumber;
      }

      // 记录思考历史
      this.thoughtHistory.push(input);

      // 处理分支
      if (input.branchFromThought && input.branchId) {
        if (!this.branches[input.branchId]) {
          this.branches[input.branchId] = [];
        }
        this.branches[input.branchId].push(input);
      }

      // 执行搜索（如果有关键词）
      let searchResults: KeywordSearchResult[] | undefined;

      if (input.searchedKeywords && input.searchedKeywords.length > 0) {
        searchResults = await this.searchKeywords(
          input.searchedKeywords,
          sessionId,
          researchConfig.maxKeywords,
          researchConfig.maxDescriptionLength,
          researchConfig.searchTimeoutMs,
          input.site
        );
      }

      // 构建返回结果
      const result: ResearchResult = {
        thoughtStatus: {
          thoughtNumber: input.thoughtNumber,
          totalThoughts: input.totalThoughts,
          nextThoughtNeeded: input.nextThoughtNeeded,
          thoughtHistoryLength: this.thoughtHistory.length,
          branches: Object.keys(this.branches)
        }
      };

      if (searchResults && searchResults.length > 0) {
        result.searchResults = searchResults;
      }

      // 如果有被跳过的关键词，添加提示
      if (input.searchedKeywords && input.searchedKeywords.length > researchConfig.maxKeywords) {
        result.message = `注意：只处理了前 ${researchConfig.maxKeywords} 个关键词，跳过了 ${input.searchedKeywords.length - researchConfig.maxKeywords} 个`;
      }

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify(result, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
            status: 'failed'
          }, null, 2)
        }],
        isError: true
      };
    }
  }
}

export const SEARCH_TOOL: Tool = {
  name: "search",
  description: `增强搜索工具 - 规划思考 + 自动搜索

功能：
1. 记录结构化思考步骤
2. 自动执行 searchedKeywords 中的搜索（并发）
3. 返回思考状态 + 搜索结果

使用方法：
1. 填写 thought 描述当前思考
2. 填写 searchedKeywords 指定要搜索的词（最多5个，自动执行）
3. 根据返回的搜索结果决定下一步
4. 如需深读某个网页，调用 read 工具

返回内容：
- thoughtStatus: 思考状态（步骤编号、是否继续等）
- searchResults: 搜索结果（每个keyword的匹配结果，包含URL用于read）

注意：
- 每个关键词应是独立的实体，避免组合查询
- 搜索结果已按相关性排序
- 结果中的URL可用于后续 read 工具深入阅读`,
  inputSchema: {
    type: "object",
    properties: {
      thought: {
        type: "string",
        description: "当前思考步骤的内容"
      },
      nextThoughtNeeded: {
        type: "boolean",
        description: "是否需要继续思考"
      },
      thoughtNumber: {
        type: "number",
        description: "当前思考步骤编号（如 1, 2, 3）"
      },
      totalThoughts: {
        type: "number",
        description: "预计总思考步骤数（如 5, 10）"
      },
      informationSummary: {
        type: "string",
        description: "上一步获取的关键发现（可选）"
      },
      searchedKeywords: {
        type: "array",
        items: { type: "string" },
        description: "要搜索的关键词列表（最多5个）。填写后会自动执行搜索并返回结果。留空则不搜索。每个关键词应是独立的实体。"
      },
      site: {
        type: "string",
        description: "限制搜索范围到具体网站。当搜索结果中发现类似知识库或者项目文档的网站时，建议使用此参数进行深度挖掘"
      },
      isRevision: {
        type: "boolean",
        description: "是否修正之前的思考（可选）"
      },
      revisesThought: {
        type: "number",
        description: "修正哪个思考步骤（可选）"
      },
      branchFromThought: {
        type: "number",
        description: "从哪个思考步骤分支（可选）"
      },
      branchId: {
        type: "string",
        description: "分支标识（可选）"
      },
      needsMoreThoughts: {
        type: "boolean",
        description: "是否需要更多思考步骤（可选）"
      }
    },
    required: ["thought", "nextThoughtNeeded", "thoughtNumber", "totalThoughts"]
  }
};
