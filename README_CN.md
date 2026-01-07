# MCP 增强搜索

MCP (Model Context Protocol) 服务器，集成 SearXNG、混合检索、语义缓存和结构化思考，支持视频网站过滤，高自由度调整，最大程度节省上下文。

Fork 自 [ihor-sokoliuk/mcp-searxng](https://github.com/ihor-sokoliuk/mcp-searxng)。

[English](./README.md) | [配置文档](./CONFIGURATION_CN.md)

## 架构

```
┌─────────────────────────────────────────────────────────────┐
│                    MCP 增强搜索                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐              │
│  │  search  │    │   read   │    │  缓存    │              │
│  │ (规划 +  │    │  (深度   │    │ (语义 + │              │
│  │  搜索)   │    │  阅读)   │    │  TTL)   │              │
│  └────┬─────┘    └────┬─────┘    └────┬─────┘              │
│       │               │               │                     │
│       ▼               ▼               ▼                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           混合检索 (BM25 + 语义嵌入)                 │   │
│  └─────────────────────────────────────────────────────┘   │
│       │                                                     │
│       ▼                                                     │
│  ┌──────────┐                                              │
│  │ SearXNG  │                                              │
│  └──────────┘                                              │
└─────────────────────────────────────────────────────────────┘
```

## 快速开始

### 基础版（无需 Ollama）

```json
{
  "mcpServers": {
    "searxng": {
      "command": "npx",
      "args": ["-y", "mcp-augmented-search"],
      "env": {
        "SEARXNG_URL": "http://localhost:8080"
      }
    }
  }
}
```

### 完整版（推荐，需要 Ollama）

```json
{
  "mcpServers": {
    "searxng": {
      "command": "npx",
      "args": ["-y", "mcp-augmented-search"],
      "env": {
        "SEARXNG_URL": "http://localhost:8080",
        "ENABLE_EMBEDDING": "true",
        "ENABLE_CACHE": "true",
        "OLLAMA_HOST": "http://localhost:11434"
      }
    }
  }
}
```

## 工具

### `search`

增强搜索工具，结构化思考 + 并发搜索。

**主要参数：**
- `thought`（字符串，必填）：当前思考步骤
- `searchedKeywords`（数组，必填）：要搜索的关键词（最多5个，并发执行）
- `thoughtNumber`（数字，必填）：当前步骤编号
- `totalThoughts`（数字，必填）：预计总步骤数
- `nextThoughtNeeded`（布尔值，必填）：是否继续
- `site`（字符串，可选）：限制搜索到指定网站

**返回格式：**
```json
{
  "thoughtStatus": {
    "thoughtNumber": 1,
    "totalThoughts": 3,
    "nextThoughtNeeded": true
  },
  "searchResults": [
    {
      "keyword": "量子计算",
      "cached": false,
      "results": [
        {
          "title": "...",
          "url": "https://...",
          "description": "...",
          "relevance": 0.85
        }
      ]
    }
  ]
}
```

### `read`

深度阅读 URL 内容，自动 Puppeteer 降级。

**主要参数：**
- `url`（字符串，必填）：要读取的 URL
- `maxLength`（数字，可选）：最大字符数（默认：3000）
- `section`（字符串，可选）：提取特定标题内容

## 安装

### Docker

```bash
docker build -t mcp-augmented-search:latest .
```

```json
{
  "mcpServers": {
    "searxng": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "-e", "SEARXNG_URL", "mcp-augmented-search:latest"],
      "env": {
        "SEARXNG_URL": "http://host.docker.internal:8080"
      }
    }
  }
}
```

### NPX

```bash
npx -y mcp-augmented-search
```

### NPM

```bash
npm install -g mcp-augmented-search
```

## 配置

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `SEARXNG_URL` | 是 | - | SearXNG 实例 URL |
| `ENABLE_EMBEDDING` | 否 | `false` | 启用混合检索 |
| `ENABLE_CACHE` | 否 | `false` | 启用缓存 |
| `OLLAMA_HOST` | 否 | `http://localhost:11434` | Ollama 服务器 URL |
| `MAX_KEYWORDS` | 否 | `5` | 每次搜索最大关键词数 |
| `MAX_DESCRIPTION_LENGTH` | 否 | `300` | 描述最大字符数 |

**完整配置：** [CONFIGURATION_CN.md](./CONFIGURATION_CN.md)

## 功能

### 混合检索
- BM25 (30%) + 语义嵌入 (70%) 提升相关性
- 需要 Ollama 运行嵌入模型

### 语义缓存
- 0.95 相似度阈值
- 会话隔离 + 全局共享
- TTL 过期机制

### 内容阅读
- 自动 Puppeteer 降级处理 JavaScript 网站
- Mozilla Readability 内容提取
- HTML 转 Markdown

## 开发

```bash
npm install
npm run watch    # 开发模式
npm run build    # 构建
npm test         # 测试
```

## 链接

- [上游仓库](https://github.com/ihor-sokoliuk/mcp-searxng)
- [SearXNG](https://docs.searxng.org)
- [MCP 协议](https://modelcontextprotocol.io)
- [Ollama](https://ollama.com)
