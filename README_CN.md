# MCP-SearXNG 服务器

集成 [SearXNG](https://docs.searxng.org) 的高级功能：混合检索、智能缓存、JavaScript 渲染。

[English Documentation](./README.md) | [详细配置](./CONFIGURATION.md)

## 快速开始

```json
{
  "mcpServers": {
    "searxng": {
      "command": "npx",
      "args": ["-y", "mcp-searxng"],
      "env": {
        "SEARXNG_URL": "http://localhost:8080"
      }
    }
  }
}
```

## 核心功能

- **混合检索**：BM25 + 语义嵌入，提升结果质量
- **语义缓存**：0.95 相似度阈值，减少重复查询
- **自动渲染**：Puppeteer 降级处理 JavaScript 页面
- **内容提取**：Mozilla Readability 去除噪声
- **会话隔离**：每个对话独立缓存
- **研究框架**：结构化思考步骤，支持深度分析

## 工具

### `search`

网络搜索，支持智能缓存和语义重排序。

**参数：**
- `query`（字符串，必填）：搜索查询
- `pageno`（数字，可选）：页码（默认：1）
- `time_range`（字符串，可选）："day"、"month" 或 "year"
- `language`（字符串，可选）：语言代码（如 "en"、"zh"）
- `safesearch`（数字，可选）：0（无）、1（中等）、2（严格）

**示例：**
```json
{
  "query": "机器学习教程",
  "language": "zh",
  "time_range": "month"
}
```

### `read`

读取 URL 内容并转换为 Markdown。

**参数：**
- `url`（字符串，必填）：要读取的 URL
- `maxLength`（数字，可选）：最多返回字符数（默认：3000）
- `section`（字符串，可选）：提取特定标题下的内容
- `readHeadings`（布尔值，可选）：仅返回标题列表
- `timeoutMs`（数字，可选）：请求超时时间（毫秒，默认：30000）

**功能：**
- 自动 Puppeteer 降级渲染 JavaScript
- 内容提取去除导航和广告
- robots.txt 合规（可选）

**示例：**
```json
{
  "url": "https://example.com/article",
  "maxLength": 2000,
  "section": "简介"
}
```

### `research`

通过结构化思考步骤进行问题解答

**参数：**
- `thought`（字符串，必填）：当前思考步骤
- `nextThoughtNeeded`（布尔值，必填）：是否需要继续思考
- `thoughtNumber`（数字，必填）：当前思考步骤编号（如 1, 2, 3）
- `totalThoughts`（数字，必填）：估算的总思考步骤数（如 5, 10）
- `isRevision`（布尔值，可选）：是否修正之前的思考
- `revisesThought`（数字，可选）：修正哪个思考步骤
- `branchFromThought`（数字，可选）：分支起点思考步骤编号
- `branchId`（字符串，可选）：分支标识符
- `needsMoreThoughts`（布尔值，可选）：是否需要更多思考

**示例：**
```json
{
  "thought": "研究量子计算与人工智能的结合",
  "nextThoughtNeeded": true,
  "thoughtNumber": 1,
  "totalThoughts": 5
}
```

**注意：** 需要设置 `ENABLE_RESEARCH_FRAMEWORK=true` 环境变量。

## 安装

### NPX（推荐）

```json
{
  "mcpServers": {
    "searxng": {
      "command": "npx",
      "args": ["-y", "mcp-searxng"],
      "env": {
        "SEARXNG_URL": "http://localhost:8080"
      }
    }
  }
}
```

### NPM

```bash
npm install -g mcp-searxng
```

```json
{
  "mcpServers": {
    "searxng": {
      "command": "mcp-searxng",
      "env": {
        "SEARXNG_URL": "http://localhost:8080"
      }
    }
  }
}
```

### Docker

```bash
docker pull ghcr.io/sebrinass/mcp-searxng:latest
```

```json
{
  "mcpServers": {
    "searxng": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "-e", "SEARXNG_URL",
        "ghcr.io/sebrinass/mcp-searxng:latest"
      ],
      "env": {
        "SEARXNG_URL": "http://localhost:8080"
      }
    }
  }
}
```

## 配置

**必填：**
- `SEARXNG_URL`：你的 SearXNG 实例 URL

**可选：**
- `ENABLE_EMBEDDING`：启用混合检索（默认：`false`）
- `ENABLE_CACHE`：启用缓存（默认：`false`）
- `ENABLE_RESEARCH_FRAMEWORK`：启用研究工具（默认：`false`）
- `OLLAMA_HOST`：Ollama 服务器 URL（默认：`http://localhost:11434`）
- `EMBEDDING_MODEL`：嵌入模型（默认：`nomic-embed-text`）

**完整配置：** [CONFIGURATION.md](./CONFIGURATION.md)

## 开发

```bash
npm install
npm run watch    # 监听模式
npm run build    # 构建
npm test        # 测试
```

## 许可证

MIT 许可证 - 详情请查看 [LICENSE](./LICENSE) 文件。

## 链接

- [SearXNG 文档](https://docs.searxng.org)
- [MCP 协议](https://modelcontextprotocol.io/introduction)

