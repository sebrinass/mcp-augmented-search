# 配置指南

MCP-SearXNG 完整配置参考。

[English](./CONFIGURATION.md)

## 快速参考

| 类别 | 变量 | 必填 | 默认值 |
|------|------|------|--------|
| **基础** | `SEARXNG_URL` | ✅ 是 | - |
| **嵌入** | `ENABLE_EMBEDDING` | 否 | `false` |
| | `OLLAMA_HOST` | 否 | `http://localhost:11434` |
| | `EMBEDDING_MODEL` | 否 | `nomic-embed-text` |
| | `TOP_K` | 否 | `3` |
| | `CHUNK_SIZE` | 否 | `1000` |
| | `CHUNK_OVERLAP` | 否 | `100` |
| **缓存** | `ENABLE_CACHE` | 否 | `false` |
| | `CACHE_TTL` | 否 | `300` |
| | `CACHE_MAX_SIZE` | 否 | `1000` |
| | `CACHE_SEARCH` | 否 | `false` |
| | `CACHE_EMBEDDING` | 否 | `false` |
| **搜索** | `MAX_KEYWORDS` | 否 | `5` |
| | `MAX_DESCRIPTION_LENGTH` | 否 | `300` |
| | `RESEARCH_SEARCH_TIMEOUT_MS` | 否 | `10000` |
| **网络** | `FETCH_TIMEOUT_MS` | 否 | `30000` |
| | `ENABLE_ROBOTS_TXT` | 否 | `false` |
| | `BLOCK_VIDEO_SITES` | 否 | `false` |
| | `VIDEO_BLOCKLIST` | 否 | - |
| | `USER_AGENT` | 否 | - |
| | `HTTP_PROXY` | 否 | - |
| | `HTTPS_PROXY` | 否 | - |
| | `NO_PROXY` | 否 | - |
| **认证** | `AUTH_USERNAME` | 否 | - |
| | `AUTH_PASSWORD` | 否 | - |
| **HTTP** | `MCP_HTTP_PORT` | 否 | - |
| **Puppeteer** | `PUPPETEER_EXECUTABLE_PATH` | 否 | - |

---

## 基础配置

### SEARXNG_URL

**必填：** 是

SearXNG 实例 URL。

```bash
SEARXNG_URL=http://localhost:8080
# Docker: http://host.docker.internal:8080
```

---

## 嵌入配置

### ENABLE_EMBEDDING

**默认值：** `false`

启用混合检索（BM25 + 语义嵌入）。

```bash
ENABLE_EMBEDDING=true   # 启用
ENABLE_EMBEDDING=false  # 禁用（默认）
```

**注意：** 需要 Ollama 运行并加载嵌入模型。

### OLLAMA_HOST

**默认值：** `http://localhost:11434`

Ollama 服务器 URL。

```bash
OLLAMA_HOST=http://localhost:11434
# Docker: http://host.docker.internal:11434
```

### EMBEDDING_MODEL

**默认值：** `nomic-embed-text`

嵌入模型名称。

```bash
EMBEDDING_MODEL=nomic-embed-text
EMBEDDING_MODEL=bge-m3
```

### TOP_K

**默认值：** `3`

返回的最相关结果数量。

```bash
TOP_K=3   # 默认
TOP_K=5   # 更多结果
```

### CHUNK_SIZE

**默认值：** `1000`

文本分块大小（字符数）。用于将长文本分成小块进行嵌入。

```bash
CHUNK_SIZE=500
CHUNK_SIZE=1000  # 默认
```

### CHUNK_OVERLAP

**默认值：** `100`

分块重叠字符数。相邻分块之间重叠的字符数，用于保持上下文连续性。

```bash
CHUNK_OVERLAP=50
CHUNK_OVERLAP=100  # 默认
```

---

## 缓存配置

### ENABLE_CACHE

**默认值：** `false`

启用 URL、搜索结果和嵌入向量的缓存。

```bash
ENABLE_CACHE=true   # 启用
ENABLE_CACHE=false  # 禁用（默认）
```

### CACHE_TTL

**默认值：** `300`（5 分钟）

缓存生存时间（秒）。

```bash
CACHE_TTL=300    # 5 分钟
CACHE_TTL=600    # 10 分钟
CACHE_TTL=3600   # 1 小时
```

### CACHE_MAX_SIZE

**默认值：** `1000`

每种缓存类型的最大条目数。

```bash
CACHE_MAX_SIZE=500
CACHE_MAX_SIZE=1000  # 默认
```

### CACHE_SEARCH

**默认值：** `false`

是否缓存搜索结果。

```bash
CACHE_SEARCH=true   # 启用
CACHE_SEARCH=false  # 禁用（默认）
```

### CACHE_EMBEDDING

**默认值：** `false`

是否缓存嵌入向量。

```bash
CACHE_EMBEDDING=true   # 启用
CACHE_EMBEDDING=false  # 禁用（默认）
```

---

## 搜索工具配置

### MAX_KEYWORDS

**默认值：** `5`

每次搜索调用的最大关键词数。

```bash
MAX_KEYWORDS=3
MAX_KEYWORDS=5  # 默认
```

### MAX_DESCRIPTION_LENGTH

**默认值：** `300`

结果描述的最大字符数。

```bash
MAX_DESCRIPTION_LENGTH=200
MAX_DESCRIPTION_LENGTH=300  # 默认
```

### RESEARCH_SEARCH_TIMEOUT_MS

**默认值：** `10000`

并发搜索超时时间（毫秒）。

```bash
RESEARCH_SEARCH_TIMEOUT_MS=5000
RESEARCH_SEARCH_TIMEOUT_MS=10000  # 默认
```

---

## 网络配置

### FETCH_TIMEOUT_MS

**默认值：** `30000`（30 秒）

HTTP 请求超时时间（毫秒）。

```bash
FETCH_TIMEOUT_MS=10000   # 10 秒
FETCH_TIMEOUT_MS=30000   # 30 秒（默认）
```

### ENABLE_ROBOTS_TXT

**默认值：** `false`

是否遵守 robots.txt 规则。

```bash
ENABLE_ROBOTS_TXT=true   # 启用
ENABLE_ROBOTS_TXT=false  # 禁用（默认）
```

### BLOCK_VIDEO_SITES

**默认值：** `false`

启用视频网站过滤，从搜索结果中移除视频网站链接。

```bash
BLOCK_VIDEO_SITES=true   # 启用
BLOCK_VIDEO_SITES=false  # 禁用（默认）
```

**注意：** 需要配合 `VIDEO_BLOCKLIST` 指定要屏蔽的域名。

### VIDEO_BLOCKLIST

**默认值：** - (空)

要屏蔽的视频网站域名列表（逗号分隔）。

```bash
VIDEO_BLOCKLIST=youtube.com,bilibili.com,tiktok.com,douyin.com,netflix.com
```

**注意：** 过滤在从 SearXNG 获取结果后、Embedding/BM25 处理前执行。

### USER_AGENT

自定义 User-Agent 头。

```bash
USER_AGENT=MyBot/1.0
```

### HTTP_PROXY / HTTPS_PROXY

代理服务器 URL。

```bash
HTTP_PROXY=http://proxy.company.com:8080
HTTPS_PROXY=http://proxy.company.com:8080
```

### NO_PROXY

不使用代理的地址列表（逗号分隔）。

```bash
NO_PROXY=localhost,127.0.0.1,.local
```

---

## 认证配置

### AUTH_USERNAME / AUTH_PASSWORD

SearXNG 的 HTTP 基本认证。

```bash
AUTH_USERNAME=admin
AUTH_PASSWORD=secure_password
```

---

## HTTP 传输

### MCP_HTTP_PORT

启用 HTTP 模式（替代 STDIO）。

```bash
MCP_HTTP_PORT=3000
```

---

## Puppeteer

### PUPPETEER_EXECUTABLE_PATH

JavaScript 渲染用的 Chromium 可执行文件路径。

```bash
# Linux
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# macOS
PUPPETEER_EXECUTABLE_PATH=/Applications/Chromium.app/Contents/MacOS/Chromium
```

---

## 配置示例

### 基础版（无 Ollama）

```bash
SEARXNG_URL=http://localhost:8080
```

### 推荐版（完整）

```bash
# 基础
SEARXNG_URL=http://localhost:8080

# 嵌入
ENABLE_EMBEDDING=true
OLLAMA_HOST=http://localhost:11434
EMBEDDING_MODEL=nomic-embed-text

# 缓存
ENABLE_CACHE=true
CACHE_TTL=300

# 搜索
MAX_KEYWORDS=5
```

### Docker Compose

```yaml
services:
  mcp-augmented-search:
    image: mcp-augmented-search:latest
    stdin_open: true
    environment:
      - SEARXNG_URL=http://host.docker.internal:8080
      - ENABLE_EMBEDDING=true
      - OLLAMA_HOST=http://host.docker.internal:11434
      - ENABLE_CACHE=true
```

---

## 故障排查

### 嵌入不工作

1. Ollama 是否运行？ `curl http://localhost:11434/api/tags`
2. 模型是否下载？ `ollama list`
3. 是否设置了 `ENABLE_EMBEDDING=true`？

### 缓存不工作

1. 是否设置了 `ENABLE_CACHE=true`？
2. 检查 TTL 和 MAX_SIZE 值

### Puppeteer 不工作

1. Chromium 是否安装？ `which chromium-browser`
2. `PUPPETEER_EXECUTABLE_PATH` 是否正确？
