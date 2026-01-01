# 配置指南

MCP-SearXNG 服务器的完整配置参考。

[English Configuration Guide](./CONFIGURATION.md)

## 快速参考

| 类别 | 变量 | 必填 | 默认值 |
|----------|---------|--------|----------|
| **基础** | `SEARXNG_URL` | ✅ 是 | - |
| **嵌入** | `ENABLE_EMBEDDING` | 否 | `true` |
| | `OLLAMA_HOST` | 否 | `http://localhost:11434` |
| | `EMBEDDING_MODEL` | 否 | `nomic-embed-text` |
| | `TOP_K` | 否 | `3` |
| | `CHUNK_SIZE` | 否 | `1000` |
| | `CHUNK_OVERLAP` | 否 | `100` |
| **缓存** | `ENABLE_CACHE` | 否 | `true` |
| | `CACHE_TTL` | 否 | `300` |
| | `CACHE_MAX_SIZE` | 否 | `1000` |
| | `CACHE_SEARCH` | 否 | `true` |
| | `CACHE_EMBEDDING` | 否 | `true` |
| **网络** | `FETCH_TIMEOUT` | 否 | `30000` |
| | `USER_AGENT` | 否 | - |
| | `HTTP_PROXY` | 否 | - |
| | `HTTPS_PROXY` | 否 | - |
| | `NO_PROXY` | 否 | - |
| **认证** | `AUTH_USERNAME` | 否 | - |
| | `AUTH_PASSWORD` | 否 | - |
| **功能** | `ENABLE_ROBOTS_TXT` | 否 | `false` |
| **HTTP** | `MCP_HTTP_PORT` | 否 | - |
| **Puppeteer** | `PUPPETEER_EXECUTABLE_PATH` | 否 | - |

---

## 基础配置

### SEARXNG_URL

**必填：** 是

**描述：** 你的 SearXNG 实例 URL。

**格式：** `<协议>://<主机名>[:<端口>]`

**示例：**
```bash
SEARXNG_URL=http://localhost:8080
SEARXNG_URL=https://search.example.com
SEARXNG_URL=https://192.168.1.100:8080
```

**注意：**
- 必须是有效的 HTTP/HTTPS URL
- SearXNG 必须正在运行且可访问
- Docker 部署时使用容器名或服务名

---

## 认证配置

### AUTH_USERNAME / AUTH_PASSWORD

**必填：** 否（设置其中一个时两个都需要）

**描述：** 受密码保护的 SearXNG 实例的 HTTP 基本认证凭据。

**示例：**
```bash
AUTH_USERNAME=admin
AUTH_PASSWORD=secure_password_123
```

**注意：**
- 两个变量必须一起设置
- 仅在 SearXNG 实例需要认证时使用
- 凭据通过 HTTP Basic Auth 头传递

---

## 网络配置

### FETCH_TIMEOUT

**必填：** 否

**默认值：** `30000`（30 秒）

**描述：** HTTP 请求超时时间（毫秒）。

**示例：**
```bash
FETCH_TIMEOUT=10000     # 10 秒
FETCH_TIMEOUT=30000     # 30 秒（默认）
FETCH_TIMEOUT=60000     # 60 秒
```

**注意：**
- 适用于搜索和 URL 读取请求
- 超时触发 URL 读取的 Puppeteer 降级
- 慢速网络或大文档时增加此值

### USER_AGENT

**必填：** 否

**描述：** HTTP 请求的自定义 User-Agent 头。

**示例：**
```bash
USER_AGENT=MyBot/1.0
USER_AGENT=Mozilla/5.0 (compatible; MyBot/1.0)
```

**注意：**
- 有助于避免被网站屏蔽
- 使用描述性的 user agent 字符串
- 某些网站会阻止默认的 user agents

### HTTP_PROXY / HTTPS_PROXY

**必填：** 否

**描述：** 用于路由 HTTP/HTTPS 流量的代理服务器 URL。

**格式：** `http://[用户名:密码@]代理主机:端口`

**示例：**
```bash
HTTP_PROXY=http://proxy.company.com:8080
HTTPS_PROXY=http://proxy.company.com:8080

# 带认证
HTTP_PROXY=http://user:pass@proxy.company.com:8080
```

**注意：**
- 每种类型仅支持一个
- 认证凭据可选
- 代理必须支持 HTTPS 的 CONNECT 方法

### NO_PROXY

**必填：** 否

**描述：** 绕过代理的主机列表（逗号分隔）。

**示例：**
```bash
NO_PROXY=localhost,127.0.0.1,.local,.internal,example.com
```

**注意：**
- 支持域名和 IP 地址
- 支持通配符域名（如 `.local`）
- 不区分大小写

---

## 嵌入配置

### ENABLE_EMBEDDING

**必填：** 否

**默认值：** `true`

**描述：** 启用混合检索功能，结合 BM25（稀疏）和语义（密集）检索。

**值：**
- `true` - 启用混合检索（BM25 + 嵌入）
- `false` - 禁用，仅使用 SearXNG 原始结果

**示例：**
```bash
ENABLE_EMBEDDING=true    # 启用混合检索（推荐）
ENABLE_EMBEDDING=false   # 禁用，仅使用关键词搜索
```

**注意：**
- 启用时：BM25 和语义检索都激活
- 禁用时：仅使用 SearXNG 原始搜索结果
- 启用时需要 Ollama 正在运行

### OLLAMA_HOST

**必填：** 否

**默认值：** `http://localhost:11434`

**描述：** 用于生成嵌入的 Ollama 服务器 URL。

**格式：** `<协议>://<主机名>[:<端口>]`

**示例：**
```bash
OLLAMA_HOST=http://localhost:11434
OLLAMA_HOST=http://192.168.1.100:11434
OLLAMA_HOST=https://ollama.example.com
```

**注意：**
- 必须是有效的 HTTP/HTTPS URL
- Ollama 必须正在运行且可访问
- 默认端口为 11434

### EMBEDDING_MODEL

**必填：** 否

**默认值：** `nomic-embed-text`

**描述：** 在 Ollama 中使用的嵌入模型名称。

**示例：**
```bash
EMBEDDING_MODEL=nomic-embed-text
EMBEDDING_MODEL=bge-m3
EMBEDDING_MODEL=mxbai-embed-large
```

**注意：**
- 模型必须先在 Ollama 中下载
- 使用 `ollama list` 查看可用模型
- 使用 `ollama pull <模型>` 下载新模型
- 不同模型有不同的性能特征

### TOP_K

**必填：** 否

**默认值：** `3`

**描述：** 基于嵌入相似度返回的顶部相似结果数量。

**示例：**
```bash
TOP_K=3      # 返回前 3 个结果（默认）
TOP_K=5      # 返回前 5 个结果
TOP_K=10     # 返回前 10 个结果
```

**注意：**
- 较高的值增加计算时间
- 典型范围：3-10
- 影响搜索和 URL 读取重排序

### CHUNK_SIZE

**必填：** 否

**默认值：** `1000`

**描述：** 嵌入生成的文本块大小（字符数）。

**示例：**
```bash
CHUNK_SIZE=500     # 更小的块，更精确
CHUNK_SIZE=1000    # 默认平衡
CHUNK_SIZE=2000    # 更大的块，更多上下文
```

**注意：**
- 更小的块：更精确的匹配，更多嵌入
- 更大的块：更多上下文，更少嵌入
- 典型范围：500-2000 字符
- 影响内存使用和计算时间

### CHUNK_OVERLAP

**必填：** 否

**默认值：** `100`

**描述：** 连续文本块之间的重叠（字符数）。

**示例：**
```bash
CHUNK_OVERLAP=50    # 最小重叠
CHUNK_OVERLAP=100   # 默认（块大小的 10%）
CHUNK_OVERLAP=200   # 高重叠
```

**注意：**
- 有助于在块边界之间保持上下文
- 通常是 CHUNK_SIZE 的 10-20%
- 更高的重叠增加计算时间

---

## 缓存配置

### ENABLE_CACHE

**必填：** 否

**默认值：** `true`

**描述：** 启用 URL、搜索结果和嵌入的缓存功能。

**值：**
- `true` - 启用缓存
- `false` - 禁用缓存

**示例：**
```bash
ENABLE_CACHE=true     # 启用缓存（推荐）
ENABLE_CACHE=false    # 禁用缓存
```

**注意：**
- 缓存显著提高性能
- 减少冗余网络请求
- 建议保持启用

### CACHE_TTL

**必填：** 否

**默认值：** `300`（5 分钟）

**描述：** 缓存生存时间（秒）。

**示例：**
```bash
CACHE_TTL=60       # 1 分钟
CACHE_TTL=300      # 5 分钟（默认）
CACHE_TTL=600      # 10 分钟
CACHE_TTL=3600     # 1 小时
```

**注意：**
- 适用于所有缓存类型（URL、搜索、嵌入）
- 较低的值：更新的数据，更多缓存未命中
- 较高的值：更好的性能，可能过时的数据
- 典型范围：60-3600 秒

### CACHE_MAX_SIZE

**必填：** 否

**默认值：** `1000`

**描述：** 每种缓存类型要缓存的最大项目数。

**示例：**
```bash
CACHE_MAX_SIZE=100   # 更小的缓存，更少内存
CACHE_MAX_SIZE=1000  # 默认平衡
CACHE_MAX_SIZE=5000  # 更大的缓存，更多内存
```

**注意：**
- 每种缓存类型（URL、搜索、嵌入）的单独限制
- 达到限制时 LRU 淘汰
- 更高的值增加内存使用
- 典型范围：100-5000 项

### CACHE_SEARCH

**必填：** 否

**默认值：** `true`

**描述：** 启用搜索结果缓存。

**值：**
- `true` - 缓存搜索结果
- `false` - 不缓存搜索结果

**示例：**
```bash
CACHE_SEARCH=true   # 缓存搜索结果（推荐）
CACHE_SEARCH=false  # 不缓存搜索结果
```

**注意：**
- 搜索结果包含语义相似度分数
- 缓存减少冗余 SearXNG 查询
- 建议保持启用

### CACHE_EMBEDDING

**必填：** 否

**默认值：** `true`

**描述：** 启用嵌入向量缓存。

**值：**
- `true` - 缓存嵌入
- `false` - 不缓存嵌入

**示例：**
```bash
CACHE_EMBEDDING=true   # 缓存嵌入（推荐）
CACHE_EMBEDDING=false  # 不缓存嵌入
```

**注意：**
- 嵌入计算开销大
- 缓存显著提高性能
- 建议保持启用

---

## 功能配置

### ENABLE_ROBOTS_TXT

**必填：** 否

**默认值：** `false`

**描述：** 在获取 URL 之前启用 robots.txt 合规检查。

**值：**
- `true` - 获取前检查 robots.txt
- `false` - 跳过 robots.txt 检查

**示例：**
```bash
ENABLE_ROBOTS_TXT=true   # 检查 robots.txt
ENABLE_ROBOTS_TXT=false  # 跳过 robots.txt（默认）
```

**注意：**
- 遵守网站的爬取策略
- 每个域名的首次请求增加约 200ms 延迟
- robots.txt 缓存 24 小时
- 错误时优雅降级为允许访问

---

## HTTP 传输配置

### MCP_HTTP_PORT

**必填：** 否

**描述：** HTTP 传输模式的端口号。设置此项将启用 HTTP 模式而不是 STDIO。

**示例：**
```bash
MCP_HTTP_PORT=3000    # 在端口 3000 启用 HTTP 模式
MCP_HTTP_PORT=8080    # 在端口 8080 启用 HTTP 模式
```

**注意：**
- 如果未设置，使用 STDIO 传输（默认）
- HTTP 模式启用 Web 客户端兼容性
- 健康端点：`GET /health`
- MCP 端点：`POST/GET/DELETE /mcp`

---

## Puppeteer 配置

### PUPPETEER_EXECUTABLE_PATH

**必填：** 否

**描述：** Puppeteer 自动降级使用的 Chromium 可执行文件路径。

**示例：**
```bash
# Linux
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# macOS
PUPPETEER_EXECUTABLE_PATH=/Applications/Chromium.app/Contents/MacOS/Chromium

# Windows
PUPPETEER_EXECUTABLE_PATH=C:\Program Files\Chromium\Application\chrome.exe
```

**注意：**
- 仅在 fetch 失败或内容为空时使用
- 如果未设置，根据平台自动检测
- 必须是有效的可执行文件路径
- 推荐 Chromium 或 Chrome

### Puppeteer 可选安装

**描述：** 可以在 Docker 构建期间选择性地安装 Puppeteer 以减小镜像体积。

**Docker 构建参数：**

**不安装 Puppeteer（推荐，镜像更小）：**
```bash
docker build -t mcp-searxng:latest .
```

**安装 Puppeteer（用于 JavaScript 渲染）：**
```bash
docker build --build-arg ENABLE_PUPPETEER=true -t mcp-searxng:latest-puppeteer .
```

**注意：**
- 不安装 Puppeteer：镜像大小约 300MB，仅使用 fetch
- 安装 Puppeteer：镜像大小约 500MB，fetch + 浏览器渲染
- Puppeteer 在 fetch 失败时自动作为降级方案使用
- 根据你对 JavaScript 密集型网站的需求选择

---

## 配置示例

### 最小配置

```bash
SEARXNG_URL=http://localhost:8080
```

### 推荐配置

```bash
# 基础
SEARXNG_URL=http://localhost:8080

# 嵌入
ENABLE_EMBEDDING=true
OLLAMA_HOST=http://localhost:11434
EMBEDDING_MODEL=nomic-embed-text
TOP_K=3
CHUNK_SIZE=1000
CHUNK_OVERLAP=100

# 缓存
ENABLE_CACHE=true
CACHE_TTL=300
CACHE_MAX_SIZE=1000
```

### 完整配置

```bash
# 基础
SEARXNG_URL=http://localhost:8080
AUTH_USERNAME=admin
AUTH_PASSWORD=secure_password_123

# 网络
FETCH_TIMEOUT=30000
USER_AGENT=MyBot/1.0
HTTP_PROXY=http://proxy.company.com:8080
HTTPS_PROXY=http://proxy.company.com:8080
NO_PROXY=localhost,127.0.0.1,.local,.internal

# 嵌入
ENABLE_EMBEDDING=true
OLLAMA_HOST=http://localhost:11434
EMBEDDING_MODEL=nomic-embed-text
TOP_K=3
CHUNK_SIZE=1000
CHUNK_OVERLAP=100

# 缓存
ENABLE_CACHE=true
CACHE_TTL=300
CACHE_MAX_SIZE=1000
CACHE_SEARCH=true
CACHE_EMBEDDING=true

# 功能
ENABLE_ROBOTS_TXT=false

# HTTP 传输
MCP_HTTP_PORT=3000

# Puppeteer
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

### Docker 配置

```yaml
version: '3.8'
services:
  mcp-searxng:
    image: isokoliuk/mcp-searxng:latest
    stdin_open: true
    environment:
      # 基础
      - SEARXNG_URL=http://searxng:8080

      # 嵌入
      - ENABLE_EMBEDDING=true
      - OLLAMA_HOST=http://ollama:11434
      - EMBEDDING_MODEL=nomic-embed-text
      - TOP_K=3
      - CHUNK_SIZE=1000
      - CHUNK_OVERLAP=100

      # 缓存
      - ENABLE_CACHE=true
      - CACHE_TTL=300
      - CACHE_MAX_SIZE=1000

      # 网络
      - FETCH_TIMEOUT=30000
      - USER_AGENT=MyBot/1.0

      # 功能
      - ENABLE_ROBOTS_TXT=false
```

---

## 故障排查

### 嵌入不工作

**检查：**
1. Ollama 是否在运行？
   ```bash
   curl http://localhost:11434/api/tags
   ```

2. 模型是否已下载？
   ```bash
   ollama list
   ```

3. `ENABLE_EMBEDDING` 是否设置为 `true`？

4. 检查服务器日志中的错误

### 缓存不工作

**检查：**
1. `ENABLE_CACHE` 是否设置为 `true`？

2. 缓存值是否合理（TTL、MAX_SIZE）？

3. 检查日志中的缓存相关消息

### Puppeteer 不工作

**检查：**
1. Chromium 是否已安装？
   ```bash
   which chromium-browser
   ```

2. `PUPPETEER_EXECUTABLE_PATH` 是否正确？

3. 检查日志中的 "falling back to Puppeteer" 消息

### 代理问题

**检查：**
1. 代理服务器是否在运行？

2. 凭据是否正确（如果使用认证）？

3. 是否为本地地址设置了 `NO_PROXY`？

---

## 链接

- [主 README](./README.md)
- [English Documentation](./README.md)
- [项目交接文档](./HANDOVER.md)
