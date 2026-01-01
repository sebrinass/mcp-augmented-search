# MCP-SearXNG Server

A fork of [ihor-sokoliuk/mcp-searxng](https://github.com/ihor-sokoliuk/mcp-searxng) that integrates [SearXNG](https://docs.searxng.org) with advanced features including hybrid retrieval, intelligent caching, and automatic JavaScript rendering.

Thanks to [ihor-sokoliuk](https://github.com/ihor-sokoliuk) for the excellent original work.

[中文文档](./README_CN.md) | [详细配置](./CONFIGURATION.md)

## Quick Start

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

## Core Features

### 🔍 Intelligent Search
- **Hybrid Retrieval**: Combines BM25 (sparse) and semantic (dense) retrieval for better results
- **Semantic Caching**: Smart cache with 0.95 similarity threshold to reduce redundant queries
- **Time Filtering**: Filter results by day, month, or year
- **Language Selection**: Get results in your preferred language
- **Safe Search**: Control content filtering level

### 📄 Advanced Content Reading
- **Auto Fallback**: When fetch fails, automatically uses Puppeteer (optional) to render JavaScript
- **Content Extraction**: Mozilla Readability extracts main content, removes noise
- **Chunk Reading**: Read large documents in parts to save tokens
- **HTML to Markdown**: Automatic conversion for better readability
- **Section Filtering**: Extract content under specific headings

### 🧠 Smart Caching
- **Multi-Level Cache**: Separate caches for URLs, search results, and embeddings
- **Session Isolation**: Each conversation has independent history
- **Global Sharing**: Cache shared across conversations for efficiency
- **Auto Cleanup**: Sessions older than 1 hour are automatically cleaned

### 🛡️ robots.txt Compliance
- Optional robots.txt checking
- Per-domain caching (24h TTL)
- Graceful fallback on errors

### 🧪 Research Framework
- **Structured Thinking**: Guides models through step-by-step analysis
- **Multi-Step Research**: Breaks complex tasks into manageable steps
- **Tool Integration**: Works with search and read for information gathering
- **Flexible Workflow**: Supports revisions and branching of thought processes

## Tools

### `search` (formerly `searxng_web_search`)

Use SearXNG to search

**Parameters:**
- `query` (string, required): Search query
- `pageno` (number, optional): Page number (default: 1)
- `time_range` (string, optional): "day", "month", or "year"
- `language` (string, optional): Language code (e.g., "en", "zh")
- `safesearch` (number, optional): 0 (none), 1 (moderate), 2 (strict)
- `sessionId` (string, optional): Session identifier for tracking

**Returns:**
- Up to 5 search results with:
  - URL, title, snippet
  - Cache hit information
  - Semantic similarity scores

**Example:**
```json
{
  "query": "machine learning tutorials",
  "language": "en",
  "time_range": "month"
}
```

### `read` (formerly `web_url_read`)

Read URL content

**Parameters:**
- `url` (string, required): URL to read
- `startChar` (number, optional): Start position (default: 0)
- `maxLength` (number, optional): Max characters to return
- `section` (string, optional): Extract content under specific heading
- `paragraphRange` (string, optional): Paragraph range (e.g., "1-5", "3")
- `readHeadings` (boolean, optional): Return only headings list
- `timeoutMs` (number, optional): Request timeout in ms (default: 30000)
- `sessionId` (string, optional): Session identifier

**Features:**
- **Auto Puppeteer Fallback**: Renders JavaScript when fetch fails
- **Content Extraction**: Removes navigation, ads, and noise
- **Chunk Reading**: Read large documents in parts
- **Section Filtering**: Get content under specific headings
- **robots.txt Checking**: Respects website rules (optional)

**Example:**
```json
{
  "url": "https://example.com/article",
  "maxLength": 2000,
  "section": "Introduction"
}
```

### `research`

Guide search planning steps

**Parameters:**
- `thought` (string, required): Current thinking step
- `nextThoughtNeeded` (boolean, required): Whether another thought step is needed
- `thoughtNumber` (number, required): Current thought number
- `totalThoughts` (number, required): Estimated total thoughts needed
- `isRevision` (boolean, optional): Whether revising previous thought
- `revisesThought` (number, optional): Which thought step to revise
- `branchFromThought` (number, optional): Branch starting point
- `branchId` (string, optional): Branch identifier
- `needsMoreThoughts` (boolean, optional): Whether more thoughts needed

**Features:**
- **Structured Thinking**: Guides models through step-by-step analysis
- **Multi-Step Research**: Breaks complex tasks into manageable steps
- **Tool Integration**: Works with search and read for information gathering
- **Flexible Workflow**: Supports revisions and branching

**Example:**
```json
{
  "thought": "Research quantum computing applications in AI",
  "nextThoughtNeeded": true,
  "thoughtNumber": 1,
  "totalThoughts": 5
}
```

## Installation

### NPX (Recommended)

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

**Without Puppeteer (Recommended, Smaller Image):**
```bash
docker build -t mcp-searxng:latest .
```

**With Puppeteer (For JavaScript Rendering):**
```bash
docker build --build-arg ENABLE_PUPPETEER=true -t mcp-searxng:latest-puppeteer .
```

**Using Pre-built Image:**
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
        "SEARXNG_URL": "http://localhost:8080"
      }
    }
  }
}
```

### Docker Compose

```yaml
services:
  mcp-searxng:
    image: isokoliuk/mcp-searxng:latest
    stdin_open: true
    environment:
      - SEARXNG_URL=http://localhost:8080
```

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

## Configuration

For detailed configuration options, see [CONFIGURATION.md](./CONFIGURATION.md).

### Quick Configuration

**Required:**
- `SEARXNG_URL`: Your SearXNG instance URL

**Optional:**
- `ENABLE_EMBEDDING`: Enable hybrid retrieval (default: `false`)
- `ENABLE_CACHE`: Enable caching (default: `false`)
- `OLLAMA_HOST`: Ollama server URL (default: `http://localhost:11434`)
- `EMBEDDING_MODEL`: Embedding model (default: `nomic-embed-text`)

**Full configuration:** [CONFIGURATION.md](./CONFIGURATION.md)

## Architecture

### Hybrid Retrieval System

```
Query
  ├─→ BM25 (Sparse) ──→ Keyword Matches
  └─→ Embedding (Dense) ──→ Semantic Matches
           ↓
      Merge (30%:70%)
           ↓
      Ranked Results
```

### Content Reading Flow

```
URL Request
    ↓
Try Fetch API
    ↓
Success? ──No──→ Puppeteer Rendering
    ↓ Yes              ↓
Extract Content    Wait for JS
    ↓                  ↓
Readability     Final HTML
    ↓                  ↓
Markdown ←────────────┘
```

### Caching Strategy

```
Request
    ↓
Check Cache (Semantic + TTL)
    ↓
Hit? ──Yes──→ Return Cached
    ↓ No
Fetch/Process
    ↓
Store in Cache
    ↓
Return Result
```

## Development

### Setup

```bash
git clone https://github.com/YOUR_USERNAME/mcp-searxng.git
cd mcp-searxng
npm install
```

### Development Mode

```bash
npm run watch    # Watch mode with auto-rebuild
npm run build    # Build once
npm test        # Run tests
```

### Testing

```bash
npm test                    # Run all tests
npm run test:coverage      # Generate coverage report
npm run inspector          # Test with MCP inspector
```

## Links

- [Upstream Repository](https://github.com/ihor-sokoliuk/mcp-searxng)
- [MCP Fetch](https://github.com/modelcontextprotocol/servers/tree/main/src/fetch)
- [Jina AI Reader](https://github.com/jina-ai/reader)
- [MCP Sequential Thinking](https://github.com/modelcontextprotocol/servers/tree/main/src/sequentialthinking)
- [SearXNG Documentation](https://docs.searxng.org)
- [MCP Protocol](https://modelcontextprotocol.io/introduction)
- [Ollama Documentation](https://ollama.com)
- [Detailed Configuration](./CONFIGURATION.md)
