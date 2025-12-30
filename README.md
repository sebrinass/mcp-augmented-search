# SearXNG MCP Server

[中文版本](./README_CN.md)

An [MCP server](https://modelcontextprotocol.io/introduction) implementation that integrates the [SearXNG](https://docs.searxng.org) API, providing web search capabilities.

[![https://nodei.co/npm/mcp-searxng.png?downloads=true&downloadRank=true&stars=true](https://nodei.co/npm/mcp-searxng.png?downloads=true&downloadRank=true&stars=true)](https://www.npmjs.com/package/mcp-searxng)

[![https://badgen.net/docker/pulls/isokoliuk/mcp-searxng](https://badgen.net/docker/pulls/isokoliuk/mcp-searxng)](https://hub.docker.com/r/isokoliuk/mcp-searxng)

<a href="https://glama.ai/mcp/servers/0j7jjyt7m9"><img width="380" height="200" src="https://glama.ai/mcp/servers/0j7jjyt7m9/badge" alt="SearXNG Server MCP server" /></a>

## Features

- **Web Search**: General queries, news, articles, with pagination.
- **URL Content Reading**: Advanced content extraction with pagination, section filtering, and heading extraction.
- **Intelligent Caching**: URL content is cached with TTL (Time-To-Live) to improve performance and reduce redundant requests.
- **Semantic Embedding**: Generate vector embeddings using Ollama for semantic similarity scoring.
- **Hybrid Retrieval**: Combine BM25 (sparse) and Dense retrieval for improved search result relevance.
- **Puppeteer Auto-Fallback**: Automatically fallback to browser rendering when fetch fails or content is empty.
- **Similarity-Based Ranking**: Combine traditional keyword matching with semantic similarity for improved search results.
- **Pagination**: Control which page of results to retrieve.
- **Time Filtering**: Filter results by time range (day, month, year).
- **Language Selection**: Filter results by preferred language.
- **Safe Search**: Control content filtering level for search results.
- **Timeout Control**: Configurable HTTP request timeout to prevent long-running requests.
- **Custom User-Agent**: Support custom User-Agent header for better website compatibility.
- **Content Chunk Reading**: Read content from specified character position with specified length.
- **HTML to Markdown**: Automatically convert HTML content to Markdown format for better readability.
- **Mozilla Readability**: Use Mozilla Readability to extract main content and remove page noise.
- **robots.txt Checking**: Optional robots.txt compliance checking with caching for performance.

## Fork Modifications

This fork adds the following enhancements to original mcp-searxng project:

### Batch URL Reading
- **Parallel Reading**: Support reading multiple URLs simultaneously for improved efficiency
- **Smart Deduplication**: Automatically filter duplicate or similar content URLs
- **Progress Tracking**: Track URLs already read in current session to avoid redundant reads

### Session Isolation System
- **Independent History**: Each conversation session maintains separate search and reading history
- **Global Cache**: Share cache across conversations for improved efficiency
- **Session Cleanup**: Automatically clean up sessions older than 1 hour
- **Deduplication Hints**: Provide hints for already searched/read content to help model avoid redundant operations

### Cache Labeling Mechanism
- **Search Result Labeling**: Mark cached content in search results
- **URL Content Labeling**: Mark cached content in URL reading results
- **Detailed Cache Info**: Provide cache hit time, content hash, and other details
- **Semantic Cache Hints**: Combine embedding similarity for more accurate cache deduplication suggestions

### Semantic Embedding Integration
- **Ollama Integration**: Added support for generating semantic embeddings using Ollama
- **Cosine Similarity Scoring**: Implemented cosine similarity algorithm to score and rank search results
- **Text Chunking**: Smart text chunking with configurable chunk size and overlap for better embedding quality
- **Top-K Results**: Retrieve top-K most similar results based on semantic similarity
- **BM25 Sparse Retrieval**: Custom BM25 algorithm implementation for keyword matching
- **Hybrid Retrieval**: Combine BM25 (sparse) and Dense retrieval with 30%:70% weight

### Enhanced Caching System
- **Multi-Level Caching**: Separate caches for URL content, search results, and embeddings
- **LRU Eviction**: Least Recently Used cache eviction when maximum size is reached
- **TTL Support**: Time-based cache expiration for all cached items
- **Memory Efficient**: In-memory caching with configurable maximum size limits

### HTTP Transport Improvements
- **Session Management**: Enhanced HTTP server with proper session handling
- **Session Recovery**: Automatically create new session when client provides sessionId that doesn't exist on server
- **CORS Support**: Added CORS headers for web client compatibility
- **Health Endpoint**: Added `/health` endpoint for monitoring

### Enhanced Logging System
- **Dual Output**: Logs output to both Docker container stdout and MCP protocol notifications
- **Formatted Output**: Timestamps and log level icons for easy reading
- **Complete Coverage**: All important operations have detailed logging for troubleshooting

## Tools

### Important Usage Notes

**⚠️ Tool Invocation Limits:**
- **Single Call Design**: All tools are designed for single invocation, batch parameters are NOT supported
- **Application-Layer Parallelism**: For parallel execution, initiate multiple independent tool calls simultaneously
- **Correct Tool Name**: Use the full tool name including `Searxng____` prefix and `____mcp` suffix

**✅ Correct Parallel Invocation (Application-Layer):**
```json
{
  "tools": [
    {
      "name": "Searxng____searxng_web_search____mcp",
      "arguments": {
        "query": "keyword1",
        "language": "zh"
      }
    },
    {
      "name": "Searxng____searxng_web_search____mcp",
      "arguments": {
        "query": "keyword2",
        "language": "zh"
      }
    },
    {
      "name": "Searxng____searxng_web_search____mcp",
      "arguments": {
        "query": "keyword3",
        "language": "zh"
      }
    }
  ]
}
```

**❌ Incorrect Invocation (Tool Not Supported):**
```json
{
  "name": "Searxng____searxng_web_search____mcp",
  "arguments": {
    "tasks": [
      {"query": "keyword1"},
      {"query": "keyword2"}
    ]
  }
}
```

- **searxng_web_search**
  - Execute web searches with pagination
  - Inputs:
    - `query` (string): The search query. This string is passed to external search services.
    - `pageno` (number, optional): Search page number, starts at 1 (default 1)
    - `time_range` (string, optional): Filter results by time range - one of: "day", "month", "year" (default: none)
    - `language` (string, optional): Language code for results (e.g., "en", "fr", "de") or "all" (default: "all")
    - `safesearch` (number, optional): Safe search filter level (0: None, 1: Moderate, 2: Strict) (default: instance setting)
    - `sessionId` (string, optional): Session identifier for tracking search history
  - Returns: List of search results with URL, title, snippet, and cache labeling information
  - **Notes**:
    - Does NOT support `tasks` batch parameter
    - For parallel search, initiate multiple independent search calls simultaneously
    - Each call returns up to 5 results

- **web_url_read**
  - Read and convert content from URLs to markdown with advanced content extraction options
  - Inputs:
    - `url` (string): Single URL to fetch and process
    - `startChar` (number, optional): Starting character position for content extraction (default: 0)
    - `maxLength` (number, optional): Maximum number of characters to return
    - `section` (string, optional): Extract content under a specific heading (searches for heading text)
    - `paragraphRange` (string, optional): Return specific paragraph ranges (e.g., '1-5', '3', '10-')
    - `readHeadings` (boolean, optional): Return only a list of headings instead of full content
    - `timeoutMs` (number, optional): HTTP request timeout in milliseconds (default: 30000)
    - `sessionId` (string, optional): Session identifier for tracking reading history
  - Returns: Extracted content in Markdown format, along with cache labeling information
  - Features:
    - **Content Extraction**: Uses Mozilla Readability to extract main content, removing navigation, ads, and other noise
    - **Format Conversion**: Automatically converts HTML content to Markdown format for better readability
    - **Chunk Reading**: Supports reading large documents in chunks using `startChar` and `maxLength` parameters
    - **Section Filtering**: Extract content under specific headings using the `section` parameter
    - **Paragraph Control**: Precisely control returned paragraphs using the `paragraphRange` parameter
    - **Timeout Control**: Control request timeout using the `timeoutMs` parameter to prevent long-running requests
    - **robots.txt Checking**: If enabled, checks target website's robots.txt rules before fetching
    - **Intelligent Caching**: URL content is cached with TTL to improve performance and reduce redundant requests
  - **Notes**:
    - Does NOT support `urls` batch parameter
    - For parallel URL reading, initiate multiple independent tool calls simultaneously

## Configuration

### Environment Variables

#### Required
- **`SEARXNG_URL`**: SearXNG instance URL (default: `http://localhost:8080`)
  - Format: `<protocol>://<hostname>[:<port>]`
  - Example: `https://search.example.com`

#### Optional
- **`AUTH_USERNAME`** / **`AUTH_PASSWORD`**: HTTP Basic Auth credentials for password-protected instances
- **`USER_AGENT`**: Custom User-Agent header (e.g., `MyBot/1.0`)
- **`HTTP_PROXY`** / **`HTTPS_PROXY`**: Proxy URLs for routing traffic
  - Format: `http://[username:password@]proxy.host:port`
- **`NO_PROXY`**: Comma-separated bypass list (e.g., `localhost,.internal,example.com`)
- **`FETCH_TIMEOUT`**: HTTP request timeout in milliseconds (default: `30000`)
- **`ENABLE_ROBOTS_TXT`**: Enable robots.txt checking (default: `false`)

#### Embedding Configuration (Ollama Integration)
- **`ENABLE_EMBEDDING`**: Enable hybrid retrieval feature (default: `true`)
  - When enabled: Both BM25 (sparse) and Dense retrieval are activated
  - When disabled: Only SearXNG original search results are used
- **`OLLAMA_HOST`**: Ollama server URL (default: `http://localhost:11434`)
- **`EMBEDDING_MODEL`**: Embedding model name (default: `nomic-embed-text`)
- **`TOP_K`**: Number of top similar results to return based on embedding similarity (default: `3`)
- **`CHUNK_SIZE`**: Text chunk size for embedding generation (default: `1000`)
- **`CHUNK_OVERLAP`**: Overlap between text chunks (default: `100`)

#### Cache Configuration
- **`ENABLE_CACHE`**: Enable caching feature (default: `true`)
- **`CACHE_TTL`**: Cache time-to-live in seconds (default: `300`)
- **`CACHE_MAX_SIZE`**: Maximum number of items to cache (default: `1000`)
- **`CACHE_SEARCH`**: Enable caching for search results (default: `true`)
- **`CACHE_EMBEDDING`**: Enable caching for embeddings (default: `true`)

## Installation & Configuration

### [NPX](https://www.npmjs.com/package/mcp-searxng)

```json
{
  "mcpServers": {
    "searxng": {
      "command": "npx",
      "args": ["-y", "mcp-searxng"],
      "env": {
        "SEARXNG_URL": "YOUR_SEARXNG_INSTANCE_URL"
      }
    }
  }
}
```

<details>
<summary>Full Configuration Example (All Options)</summary>

```json
{
  "mcpServers": {
    "searxng": {
      "command": "npx",
      "args": ["-y", "mcp-searxng"],
      "env": {
        "SEARXNG_URL": "YOUR_SEARXNG_INSTANCE_URL",
        "AUTH_USERNAME": "your_username",
        "AUTH_PASSWORD": "your_password",
        "USER_AGENT": "MyBot/1.0",
        "HTTP_PROXY": "http://proxy.company.com:8080",
        "HTTPS_PROXY": "http://proxy.company.com:8080",
        "NO_PROXY": "localhost,127.0.0.1,.local,.internal",
        "FETCH_TIMEOUT": "30000",
        "ENABLE_ROBOTS_TXT": "false"
      }
    }
  }
}
```

**Note:** Mix and match environment variables as needed. All optional variables can be used independently or together.

</details>

### [NPM](https://www.npmjs.com/package/mcp-searxng)

```bash
npm install -g mcp-searxng
```

```json
{
  "mcpServers": {
    "searxng": {
      "command": "mcp-searxng",
      "env": {
        "SEARXNG_URL": "YOUR_SEARXNG_INSTANCE_URL"
      }
    }
  }
}
```

<details>
<summary>Full Configuration Example (All Options)</summary>

```json
{
  "mcpServers": {
    "searxng": {
      "command": "mcp-searxng",
      "env": {
        "SEARXNG_URL": "YOUR_SEARXNG_INSTANCE_URL",
        "AUTH_USERNAME": "your_username",
        "AUTH_PASSWORD": "your_password",
        "USER_AGENT": "MyBot/1.0",
        "HTTP_PROXY": "http://proxy.company.com:8080",
        "HTTPS_PROXY": "http://proxy.company.com:8080",
        "NO_PROXY": "localhost,127.0.0.1,.local,.internal",
        "FETCH_TIMEOUT": "30000",
        "ENABLE_ROBOTS_TXT": "false"
      }
    }
  }
}
```

</details>

### Docker

#### Using [Pre-built Image from Docker Hub](https://hub.docker.com/r/isokoliuk/mcp-searxng)

```bash
docker pull isokoliuk/mcp-searxng:latest
```

```json
{
  "mcpServers": {
    "searxng": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "-e", "SEARXNG_URL",
        "isokoliuk/mcp-searxng:latest"
      ],
      "env": {
        "SEARXNG_URL": "YOUR_SEARXNG_INSTANCE_URL"
      }
    }
  }
}
```

<details>
<summary>Full Configuration Example (All Options)</summary>

```json
{
  "mcpServers": {
    "searxng": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "-e", "SEARXNG_URL",
        "-e", "AUTH_USERNAME",
        "-e", "AUTH_PASSWORD",
        "-e", "USER_AGENT",
        "-e", "HTTP_PROXY",
        "-e", "HTTPS_PROXY",
        "-e", "NO_PROXY",
        "-e", "FETCH_TIMEOUT",
        "-e", "ENABLE_ROBOTS_TXT",
        "isokoliuk/mcp-searxng:latest"
      ],
      "env": {
        "SEARXNG_URL": "YOUR_SEARXNG_INSTANCE_URL",
        "AUTH_USERNAME": "your_username",
        "AUTH_PASSWORD": "your_password",
        "USER_AGENT": "MyBot/1.0",
        "HTTP_PROXY": "http://proxy.company.com:8080",
        "HTTPS_PROXY": "http://proxy.company.com:8080",
        "NO_PROXY": "localhost,127.0.0.1,.local,.internal",
        "FETCH_TIMEOUT": "30000",
        "ENABLE_ROBOTS_TXT": "false"
      }
    }
  }
}
```

**Note:** Add only the `-e` flags and env variables you need.

</details>

#### Build Locally

```bash
docker build -t mcp-searxng:latest -f Dockerfile .
```

Use the same configuration as above, replacing `isokoliuk/mcp-searxng:latest` with `mcp-searxng:latest`.

#### Docker Compose

Create a `docker-compose.yml` file:

```yaml
services:
  mcp-searxng:
    image: isokoliuk/mcp-searxng:latest
    stdin_open: true
    environment:
      - SEARXNG_URL=YOUR_SEARXNG_INSTANCE_URL
      # Add any optional variables as needed:
      # - AUTH_USERNAME=your_username
      # - AUTH_PASSWORD=your_password
      # - USER_AGENT=MyBot/1.0
      # - HTTP_PROXY=http://proxy.company.com:8080
      # - HTTPS_PROXY=http://proxy.company.com:8080
      # - NO_PROXY=localhost,127.0.0.1,.local,.internal
      # - FETCH_TIMEOUT=30000
      # - ENABLE_ROBOTS_TXT=false
```

Then configure your MCP client:

```json
{
  "mcpServers": {
    "searxng": {
      "command": "docker-compose",
      "args": ["run", "--rm", "mcp-searxng"]
    }
  }
}
```

### HTTP Transport (Optional)

The server supports both STDIO (default) and HTTP transports. Set `MCP_HTTP_PORT` to enable HTTP mode.

```json
{
  "mcpServers": {
    "searxng-http": {
      "command": "mcp-searxng",
      "env": {
        "SEARXNG_URL": "YOUR_SEARXNG_INSTANCE_URL",
        "MCP_HTTP_PORT": "3000"
      }
    }
  }
}
```

**HTTP Endpoints:**
- **MCP Protocol**: `POST/GET/DELETE /mcp` 
- **Health Check**: `GET /health`

**Testing:**
```bash
MCP_HTTP_PORT=3000 SEARXNG_URL=http://localhost:8080 mcp-searxng
curl http://localhost:3000/health
```

## Running evals

```bash
SEARXNG_URL=YOUR_URL OPENAI_API_KEY=your-key npx mcp-eval evals.ts src/index.ts
```

## For Developers

### Contributing

We welcome contributions! Follow these guidelines:

**Coding Standards:**
- Use TypeScript with strict type safety
- Follow existing error handling patterns
- Write concise, informative error messages
- Include unit tests for new functionality
- Maintain 90%+ test coverage
- Test with MCP inspector before submitting
- Run evals to verify functionality

**Workflow:**

1. **Fork and clone:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/mcp-searxng.git
   cd mcp-searxng
   git remote add upstream https://github.com/ihor-sokoliuk/mcp-searxng.git
   ```

2. **Setup:**
   ```bash
   npm install
   npm run watch  # Development mode with file watching
   ```

3. **Development:**
   ```bash
   git checkout -b feature/your-feature-name
   # Make changes in src/
   npm run build
   npm test
   npm run test:coverage
   npm run inspector
   ```

4. **Submit:**
   ```bash
   git commit -m "feat: description"
   git push origin feature/your-feature-name
   # Create PR on GitHub
   ```

### Testing

```bash
npm test                    # Run all tests
npm run test:coverage      # Generate coverage report
npm run test:watch         # Watch mode
```

**Coverage:** 100% success rate with comprehensive unit tests covering error handling, types, proxy configs, resources, and logging.

## License

This MCP server is licensed under the MIT License. This means you are free to use, modify, and distribute the software, subject to the terms and conditions of the MIT License. For more details, please see the LICENSE file in the project repository.
