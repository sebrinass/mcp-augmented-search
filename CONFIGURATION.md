# Configuration Guide

Complete configuration reference for MCP-SearXNG server.

[中文配置指南](./CONFIGURATION_CN.md)

## Quick Reference

| Category | Variable | Required | Default |
|----------|-----------|----------|
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
| **Network** | `FETCH_TIMEOUT` | No | `30000` |
| | `USER_AGENT` | No | - |
| | `HTTP_PROXY` | No | - |
| | `HTTPS_PROXY` | No | - |
| | `NO_PROXY` | No | - |
| **Auth** | `AUTH_USERNAME` | No | - |
| | `AUTH_PASSWORD` | No | - |
| **Features** | `ENABLE_RESEARCH_FRAMEWORK` | No | `false` |
| | `ENABLE_ROBOTS_TXT` | No | `false` |
| **HTTP** | `MCP_HTTP_PORT` | No | - |
| **Puppeteer** | `PUPPETEER_EXECUTABLE_PATH` | No | - |

---

## Basic Configuration

### SEARXNG_URL

**Required:** Yes

**Description:** URL of your SearXNG instance.

**Format:** `<protocol>://<hostname>[:<port>]`

**Examples:**
```bash
SEARXNG_URL=http://localhost:8080
SEARXNG_URL=https://search.example.com
SEARXNG_URL=https://192.168.1.100:8080
```

**Notes:**
- Must be a valid HTTP/HTTPS URL
- SearXNG must be running and accessible
- For Docker deployments, use container name or service name

---

## Authentication

### AUTH_USERNAME / AUTH_PASSWORD

**Required:** No (both required if one is set)

**Description:** HTTP Basic Authentication credentials for password-protected SearXNG instances.

**Examples:**
```bash
AUTH_USERNAME=admin
AUTH_PASSWORD=secure_password_123
```

**Notes:**
- Both variables must be set together
- Only use if your SearXNG instance requires authentication
- Credentials are passed in HTTP Basic Auth header

---

## Network Configuration

### FETCH_TIMEOUT

**Required:** No

**Default:** `30000` (30 seconds)

**Description:** HTTP request timeout in milliseconds.

**Examples:**
```bash
FETCH_TIMEOUT=10000     # 10 seconds
FETCH_TIMEOUT=30000     # 30 seconds (default)
FETCH_TIMEOUT=60000     # 60 seconds
```

**Notes:**
- Applies to both search and URL reading requests
- Timeout triggers Puppeteer fallback for URL reading
- Increase for slow networks or large documents

### USER_AGENT

**Required:** No

**Description:** Custom User-Agent header for HTTP requests.

**Examples:**
```bash
USER_AGENT=MyBot/1.0
USER_AGENT=Mozilla/5.0 (compatible; MyBot/1.0)
```

**Notes:**
- Helps avoid being blocked by websites
- Use descriptive user agent strings
- Some websites block default user agents

### HTTP_PROXY / HTTPS_PROXY

**Required:** No

**Description:** Proxy server URLs for routing HTTP/HTTPS traffic.

**Format:** `http://[username:password@]proxy.host:port`

**Examples:**
```bash
HTTP_PROXY=http://proxy.company.com:8080
HTTPS_PROXY=http://proxy.company.com:8080

# With authentication
HTTP_PROXY=http://user:pass@proxy.company.com:8080
```

**Notes:**
- Only one of each type supported
- Authentication credentials optional
- Proxy must support CONNECT method for HTTPS

### NO_PROXY

**Required:** No

**Description:** Comma-separated list of hosts to bypass proxy.

**Examples:**
```bash
NO_PROXY=localhost,127.0.0.1,.local,.internal,example.com
```

**Notes:**
- Supports domain names and IP addresses
- Wildcard domains supported (e.g., `.local`)
- Case-insensitive

---

## Embedding Configuration

### ENABLE_EMBEDDING

**Required:** No

**Default:** `false`

**Description:** Enable hybrid retrieval feature combining BM25 (sparse) and semantic (dense) retrieval.

**Values:**
- `true` - Enable hybrid retrieval (BM25 + Embedding)
- `false` - Disable, use only SearXNG original results

**Examples:**
```bash
ENABLE_EMBEDDING=true    # Enable hybrid retrieval
ENABLE_EMBEDDING=false   # Disable, use keyword-only search (default)
```

**Notes:**
- When enabled: Both BM25 and semantic retrieval are active
- When disabled: Only SearXNG original search results are used
- Requires Ollama to be running if enabled

### OLLAMA_HOST

**Required:** No

**Default:** `http://localhost:11434`

**Description:** URL of the Ollama server for embedding generation.

**Format:** `<protocol>://<hostname>[:<port>]`

**Examples:**
```bash
OLLAMA_HOST=http://localhost:11434
OLLAMA_HOST=http://192.168.1.100:11434
OLLAMA_HOST=https://ollama.example.com
```

**Notes:**
- Must be a valid HTTP/HTTPS URL
- Ollama must be running and accessible
- Default port is 11434

### EMBEDDING_MODEL

**Required:** No

**Default:** `nomic-embed-text`

**Description:** Name of the embedding model to use in Ollama.

**Examples:**
```bash
EMBEDDING_MODEL=nomic-embed-text
EMBEDDING_MODEL=bge-m3
EMBEDDING_MODEL=mxbai-embed-large
```

**Notes:**
- Model must be downloaded in Ollama first
- Use `ollama list` to see available models
- Use `ollama pull <model>` to download new models
- Different models have different performance characteristics

### TOP_K

**Required:** No

**Default:** `3`

**Description:** Number of top similar results to return based on embedding similarity.

**Examples:**
```bash
TOP_K=3      # Return top 3 results (default)
TOP_K=5      # Return top 5 results
TOP_K=10     # Return top 10 results
```

**Notes:**
- Higher values increase computation time
- Typical range: 3-10
- Affects both search and URL reading reranking

### CHUNK_SIZE

**Required:** No

**Default:** `1000`

**Description:** Text chunk size (in characters) for embedding generation.

**Examples:**
```bash
CHUNK_SIZE=500     # Smaller chunks, more precise
CHUNK_SIZE=1000    # Default balance
CHUNK_SIZE=2000    # Larger chunks, more context
```

**Notes:**
- Smaller chunks: More precise matching, more embeddings
- Larger chunks: More context, fewer embeddings
- Typical range: 500-2000 characters
- Affects memory usage and computation time

### CHUNK_OVERLAP

**Required:** No

**Default:** `100`

**Description:** Overlap (in characters) between consecutive text chunks.

**Examples:**
```bash
CHUNK_OVERLAP=50    # Minimal overlap
CHUNK_OVERLAP=100   # Default (10% of chunk size)
CHUNK_OVERLAP=200   # High overlap
```

**Notes:**
- Helps maintain context across chunk boundaries
- Usually 10-20% of CHUNK_SIZE
- Higher overlap increases computation time

---

## Cache Configuration

### ENABLE_CACHE

**Required:** No

**Default:** `false`

**Description:** Enable caching feature for URLs, search results, and embeddings.

**Values:**
- `true` - Enable caching
- `false` - Disable caching (default)

**Examples:**
```bash
ENABLE_CACHE=true     # Enable caching
ENABLE_CACHE=false    # Disable caching (default)
```

**Notes:**
- Caching significantly improves performance
- Reduces redundant network requests
- Requires explicit enable for advanced features

### CACHE_TTL

**Required:** No

**Default:** `300` (5 minutes)

**Description:** Cache time-to-live in seconds.

**Examples:**
```bash
CACHE_TTL=60       # 1 minute
CACHE_TTL=300      # 5 minutes (default)
CACHE_TTL=600      # 10 minutes
CACHE_TTL=3600     # 1 hour
```

**Notes:**
- Applies to all cache types (URL, search, embedding)
- Lower values: More fresh data, more cache misses
- Higher values: Better performance, potentially stale data
- Typical range: 60-3600 seconds

### CACHE_MAX_SIZE

**Required:** No

**Default:** `1000`

**Description:** Maximum number of items to cache per cache type.

**Examples:**
```bash
CACHE_MAX_SIZE=100   # Smaller cache, less memory
CACHE_MAX_SIZE=1000  # Default balance
CACHE_MAX_SIZE=5000  # Larger cache, more memory
```

**Notes:**
- Separate limit for each cache type (URL, search, embedding)
- LRU eviction when limit reached
- Higher values increase memory usage
- Typical range: 100-5000 items

### CACHE_SEARCH

**Required:** No

**Default:** `false`

**Description:** Enable caching for search results.

**Values:**
- `true` - Cache search results
- `false` - Don't cache search results (default)

**Examples:**
```bash
CACHE_SEARCH=true   # Cache search results
CACHE_SEARCH=false  # Don't cache search results (default)
```

**Notes:**
- Search results include semantic similarity scores
- Caching reduces redundant SearXNG queries
- Requires ENABLE_CACHE=true to work

### CACHE_EMBEDDING

**Required:** No

**Default:** `false`

**Description:** Enable caching for embedding vectors.

**Values:**
- `true` - Cache embeddings
- `false` - Don't cache embeddings (default)

**Examples:**
```bash
CACHE_EMBEDDING=true   # Cache embeddings
CACHE_EMBEDDING=false  # Don't cache embeddings (default)
```

**Notes:**
- Embeddings are computationally expensive to generate
- Caching significantly improves performance
- Requires ENABLE_CACHE=true to work

---

## Feature Configuration

### ENABLE_RESEARCH_FRAMEWORK

**Required:** No

**Default:** `false`

**Description:** Enable the research tool for structured thinking and deep analysis.

**Values:**
- `true` - Enable research tool
- `false` - Disable research tool (default)

**Examples:**
```bash
ENABLE_RESEARCH_FRAMEWORK=true   # Enable research tool
ENABLE_RESEARCH_FRAMEWORK=false  # Disable research tool (default)
```

**Notes:**
- Research tool guides models through structured thinking steps
- Helps with complex multi-step research tasks
- Works with search and read tools for information gathering
- Requires ENABLE_EMBEDDING=true for best results

### ENABLE_ROBOTS_TXT

**Required:** No

**Default:** `false`

**Description:** Enable robots.txt compliance checking before fetching URLs.

**Values:**
- `true` - Check robots.txt before fetching
- `false` - Skip robots.txt checking

**Examples:**
```bash
ENABLE_ROBOTS_TXT=true   # Check robots.txt
ENABLE_ROBOTS_TXT=false  # Skip robots.txt (default)
```

**Notes:**
- Respects website's crawling policies
- Adds ~200ms latency on first request per domain
- robots.txt is cached for 24 hours
- Falls back to allow access on errors

---

## HTTP Transport Configuration

### MCP_HTTP_PORT

**Required:** No

**Description:** Port number for HTTP transport mode. Setting this enables HTTP mode instead of STDIO.

**Examples:**
```bash
MCP_HTTP_PORT=3000    # Enable HTTP mode on port 3000
MCP_HTTP_PORT=8080    # Enable HTTP mode on port 8080
```

**Notes:**
- If not set, uses STDIO transport (default)
- HTTP mode enables web client compatibility
- Health endpoint: `GET /health`
- MCP endpoint: `POST/GET/DELETE /mcp`

---

## Puppeteer Configuration

### PUPPETEER_EXECUTABLE_PATH

**Required:** No

**Description:** Path to Chromium executable for Puppeteer auto-fallback.

**Examples:**
```bash
# Linux
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# macOS
PUPPETEER_EXECUTABLE_PATH=/Applications/Chromium.app/Contents/MacOS/Chromium

# Windows
PUPPETEER_EXECUTABLE_PATH=C:\Program Files\Chromium\Application\chrome.exe
```

**Notes:**
- Only used when fetch fails or content is empty
- Auto-detected based on platform if not set
- Must be a valid executable path
- Chromium or Chrome recommended

---

## Example Configurations

### Minimal Configuration

```bash
SEARXNG_URL=http://localhost:8080
```

### Recommended Configuration

```bash
# Basic
SEARXNG_URL=http://localhost:8080

# Embedding
ENABLE_EMBEDDING=true
OLLAMA_HOST=http://localhost:11434
EMBEDDING_MODEL=nomic-embed-text
TOP_K=3
CHUNK_SIZE=1000
CHUNK_OVERLAP=100

# Cache
ENABLE_CACHE=true
CACHE_TTL=300
CACHE_MAX_SIZE=1000
```

### Full Configuration

```bash
# Basic
SEARXNG_URL=http://localhost:8080
AUTH_USERNAME=admin
AUTH_PASSWORD=secure_password_123

# Network
FETCH_TIMEOUT=30000
USER_AGENT=MyBot/1.0
HTTP_PROXY=http://proxy.company.com:8080
HTTPS_PROXY=http://proxy.company.com:8080
NO_PROXY=localhost,127.0.0.1,.local,.internal

# Embedding
ENABLE_EMBEDDING=true
OLLAMA_HOST=http://localhost:11434
EMBEDDING_MODEL=nomic-embed-text
TOP_K=3
CHUNK_SIZE=1000
CHUNK_OVERLAP=100

# Cache
ENABLE_CACHE=true
CACHE_TTL=300
CACHE_MAX_SIZE=1000
CACHE_SEARCH=true
CACHE_EMBEDDING=true

# Features
ENABLE_RESEARCH_FRAMEWORK=true
ENABLE_ROBOTS_TXT=false

# HTTP Transport
MCP_HTTP_PORT=3000

# Puppeteer
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

### Docker Configuration

```yaml
version: '3.8'
services:
  mcp-searxng:
    image: isokoliuk/mcp-searxng:latest
    stdin_open: true
    environment:
      # Basic
      - SEARXNG_URL=http://searxng:8080

      # Embedding
      - ENABLE_EMBEDDING=true
      - OLLAMA_HOST=http://ollama:11434
      - EMBEDDING_MODEL=nomic-embed-text
      - TOP_K=3
      - CHUNK_SIZE=1000
      - CHUNK_OVERLAP=100

      # Cache
      - ENABLE_CACHE=true
      - CACHE_TTL=300
      - CACHE_MAX_SIZE=1000

      # Network
      - FETCH_TIMEOUT=30000
      - USER_AGENT=MyBot/1.0

      # Features
      - ENABLE_ROBOTS_TXT=false
```

---

## Troubleshooting

### Embedding Not Working

**Check:**
1. Is Ollama running?
   ```bash
   curl http://localhost:11434/api/tags
   ```

2. Is the model downloaded?
   ```bash
   ollama list
   ```

3. Is `ENABLE_EMBEDDING` set to `true`?

4. Check server logs for errors

### Cache Not Working

**Check:**
1. Is `ENABLE_CACHE` set to `true`?

2. Are cache values reasonable (TTL, MAX_SIZE)?

3. Check logs for cache-related messages

### Puppeteer Not Working

**Check:**
1. Is Chromium installed?
   ```bash
   which chromium-browser
   ```

2. Is `PUPPETEER_EXECUTABLE_PATH` correct?

3. Check logs for "falling back to Puppeteer" messages

### Proxy Issues

**Check:**
1. Is proxy server running?

2. Are credentials correct (if using auth)?

3. Is `NO_PROXY` set for local addresses?

---

## Links

- [Main README](./README.md)
- [中文文档](./README_CN.md)
- [Project Handover](./HANDOVER.md)
