# Configuration Guide

Complete configuration reference for MCP-SearXNG.

[中文配置](./CONFIGURATION_CN.md)

## Quick Reference

| Category | Variable | Required | Default |
|----------|----------|----------|---------|
| **Basic** | `SEARXNG_URL` | ✅ Yes | - |
| **Embedding** | `ENABLE_EMBEDDING` | No | `false` |
| | `OLLAMA_HOST` | No | `http://localhost:11434` |
| | `EMBEDDING_MODEL` | No | `nomic-embed-text` |
| | `TOP_K` | No | `3` |
| | `CHUNK_SIZE` | No | `1000` |
| | `CHUNK_OVERLAP` | No | `100` |
| **Cache** | `ENABLE_CACHE` | No | `false` |
| | `CACHE_TTL` | No | `300` |
| | `CACHE_MAX_SIZE` | No | `1000` |
| | `CACHE_SEARCH` | No | `false` |
| | `CACHE_EMBEDDING` | No | `false` |
| **Search** | `MAX_KEYWORDS` | No | `5` |
| | `MAX_DESCRIPTION_LENGTH` | No | `300` |
| | `RESEARCH_SEARCH_TIMEOUT_MS` | No | `10000` |
| **Network** | `FETCH_TIMEOUT_MS` | No | `30000` |
| | `ENABLE_ROBOTS_TXT` | No | `false` |
| | `BLOCK_VIDEO_SITES` | No | `false` |
| | `VIDEO_BLOCKLIST` | No | - |
| | `USER_AGENT` | No | - |
| | `HTTP_PROXY` | No | - |
| | `HTTPS_PROXY` | No | - |
| | `NO_PROXY` | No | - |
| **Auth** | `AUTH_USERNAME` | No | - |
| | `AUTH_PASSWORD` | No | - |
| **HTTP** | `MCP_HTTP_PORT` | No | - |
| **Puppeteer** | `PUPPETEER_EXECUTABLE_PATH` | No | - |

---

## Basic

### SEARXNG_URL

**Required:** Yes

SearXNG instance URL.

```bash
SEARXNG_URL=http://localhost:8080
# Docker: http://host.docker.internal:8080
```

---

## Embedding

### ENABLE_EMBEDDING

**Default:** `false`

Enable hybrid retrieval (BM25 + Embedding).

```bash
ENABLE_EMBEDDING=true   # Enable
ENABLE_EMBEDDING=false  # Disable (default)
```

**Note:** Requires Ollama running with embedding model.

### OLLAMA_HOST

**Default:** `http://localhost:11434`

Ollama server URL.

```bash
OLLAMA_HOST=http://localhost:11434
# Docker: http://host.docker.internal:11434
```

### EMBEDDING_MODEL

**Default:** `nomic-embed-text`

Embedding model name.

```bash
EMBEDDING_MODEL=nomic-embed-text
EMBEDDING_MODEL=bge-m3
```

### TOP_K

**Default:** `3`

Number of top results to return.

```bash
TOP_K=3   # Default
TOP_K=5   # More results
```

### CHUNK_SIZE

**Default:** `1000`

Text chunk size (in characters). Used to split long text into smaller chunks for embedding.

```bash
CHUNK_SIZE=500
CHUNK_SIZE=1000  # Default
```

### CHUNK_OVERLAP

**Default:** `100`

Chunk overlap characters. Number of overlapping characters between adjacent chunks to maintain context continuity.

```bash
CHUNK_OVERLAP=50
CHUNK_OVERLAP=100  # Default
```

---

## Cache

### ENABLE_CACHE

**Default:** `false`

Enable caching for URLs, search results, and embeddings.

```bash
ENABLE_CACHE=true   # Enable
ENABLE_CACHE=false  # Disable (default)
```

### CACHE_TTL

**Default:** `300` (5 minutes)

Cache time-to-live in seconds.

```bash
CACHE_TTL=300    # 5 minutes
CACHE_TTL=600    # 10 minutes
CACHE_TTL=3600   # 1 hour
```

### CACHE_MAX_SIZE

**Default:** `1000`

Maximum cache items per type.

```bash
CACHE_MAX_SIZE=500
CACHE_MAX_SIZE=1000  # Default
```

### CACHE_SEARCH

**Default:** `false`

Whether to cache search results.

```bash
CACHE_SEARCH=true   # Enable
CACHE_SEARCH=false  # Disable (default)
```

### CACHE_EMBEDDING

**Default:** `false`

Whether to cache embedding vectors.

```bash
CACHE_EMBEDDING=true   # Enable
CACHE_EMBEDDING=false  # Disable (default)
```

---

## Search Tool

### MAX_KEYWORDS

**Default:** `5`

Maximum keywords per search call.

```bash
MAX_KEYWORDS=3
MAX_KEYWORDS=5  # Default
```

### MAX_DESCRIPTION_LENGTH

**Default:** `300`

Maximum characters in result description.

```bash
MAX_DESCRIPTION_LENGTH=200
MAX_DESCRIPTION_LENGTH=300  # Default
```

### RESEARCH_SEARCH_TIMEOUT_MS

**Default:** `10000`

Concurrent search timeout in milliseconds.

```bash
RESEARCH_SEARCH_TIMEOUT_MS=5000
RESEARCH_SEARCH_TIMEOUT_MS=10000  # Default
```

---

## Network

### FETCH_TIMEOUT_MS

**Default:** `30000` (30 seconds)

HTTP request timeout in milliseconds.

```bash
FETCH_TIMEOUT_MS=10000   # 10 seconds
FETCH_TIMEOUT_MS=30000   # 30 seconds (default)
```

### ENABLE_ROBOTS_TXT

**Default:** `false`

Whether to respect robots.txt rules.

```bash
ENABLE_ROBOTS_TXT=true   # Enable
ENABLE_ROBOTS_TXT=false  # Disable (default)
```

### BLOCK_VIDEO_SITES

**Default:** `false`

Enable filtering of video websites from search results.

```bash
BLOCK_VIDEO_SITES=true   # Enable
BLOCK_VIDEO_SITES=false  # Disable (default)
```

**Note:** Requires `VIDEO_BLOCKLIST` to specify which domains to block.

### VIDEO_BLOCKLIST

**Default:** - (empty)

Comma-separated list of video website domains to block.

```bash
VIDEO_BLOCKLIST=youtube.com,bilibili.com,tiktok.com,douyin.com,netflix.com
```

**Note:** Filtering happens after SearXNG results are retrieved but before embedding/BM25 processing.

### USER_AGENT

Custom User-Agent header.

```bash
USER_AGENT=MyBot/1.0
```

### HTTP_PROXY / HTTPS_PROXY

Proxy server URLs.

```bash
HTTP_PROXY=http://proxy.company.com:8080
HTTPS_PROXY=http://proxy.company.com:8080
```

### NO_PROXY

List of addresses to bypass proxy (comma-separated).

```bash
NO_PROXY=localhost,127.0.0.1,.local
```

---

## Authentication

### AUTH_USERNAME / AUTH_PASSWORD

HTTP Basic Auth for SearXNG.

```bash
AUTH_USERNAME=admin
AUTH_PASSWORD=secure_password
```

---

## HTTP Transport

### MCP_HTTP_PORT

Enable HTTP mode instead of STDIO.

```bash
MCP_HTTP_PORT=3000
```

---

## Puppeteer

### PUPPETEER_EXECUTABLE_PATH

Chromium executable path for JavaScript rendering.

```bash
# Linux
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# macOS
PUPPETEER_EXECUTABLE_PATH=/Applications/Chromium.app/Contents/MacOS/Chromium
```

---

## Example Configurations

### Basic (No Ollama)

```bash
SEARXNG_URL=http://localhost:8080
```

### Recommended (Full)

```bash
# Basic
SEARXNG_URL=http://localhost:8080

# Embedding
ENABLE_EMBEDDING=true
OLLAMA_HOST=http://localhost:11434
EMBEDDING_MODEL=nomic-embed-text

# Cache
ENABLE_CACHE=true
CACHE_TTL=300

# Search
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

## Troubleshooting

### Embedding Not Working

1. Is Ollama running? `curl http://localhost:11434/api/tags`
2. Is model downloaded? `ollama list`
3. Is `ENABLE_EMBEDDING=true`?

### Cache Not Working

1. Is `ENABLE_CACHE=true`?
2. Check TTL and MAX_SIZE values

### Puppeteer Not Working

1. Is Chromium installed? `which chromium-browser`
2. Is `PUPPETEER_EXECUTABLE_PATH` correct?
