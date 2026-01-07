# MCP Augmented Search

[![MCP Badge](https://lobehub.com/badge/mcp/sebrinass-mcp-augmented-search)](https://lobehub.com/mcp/sebrinass-mcp-augmented-search)

MCP (Model Context Protocol) server that integrates SearXNG with hybrid retrieval, semantic caching, and structured thinking, featuring video site filtering, highly customizable, and maximizing context efficiency.

Fork of [ihor-sokoliuk/mcp-searxng](https://github.com/ihor-sokoliuk/mcp-searxng).

[中文文档](./README_CN.md) | [Configuration](./CONFIGURATION.md)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    MCP Augmented Search                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐              │
│  │  search  │    │   read   │    │  Cache   │              │
│  │ (Plan +  │    │  (Deep   │    │ (Semantic│              │
│  │  Search) │    │  Read)   │    │  + TTL)  │              │
│  └────┬─────┘    └────┬─────┘    └────┬─────┘              │
│       │               │               │                     │
│       ▼               ▼               ▼                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Hybrid Retrieval (BM25 + Embedding)    │   │
│  └─────────────────────────────────────────────────────┘   │
│       │                                                     │
│       ▼                                                     │
│  ┌──────────┐                                              │
│  │ SearXNG  │                                              │
│  └──────────┘                                              │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### Basic (No Ollama required)

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

### Full (Recommended, with Ollama)

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

## Tools

### `search`

Enhanced search tool with structured thinking and concurrent search.

**Key Parameters:**
- `thought` (string, required): Current thinking step
- `searchedKeywords` (array, required): Keywords to search (max 5, executed concurrently)
- `thoughtNumber` (number, required): Current step number
- `totalThoughts` (number, required): Estimated total steps
- `nextThoughtNeeded` (boolean, required): Whether to continue
- `site` (string, optional): Restrict search to specific website

**Response Format:**
```json
{
  "thoughtStatus": {
    "thoughtNumber": 1,
    "totalThoughts": 3,
    "nextThoughtNeeded": true
  },
  "searchResults": [
    {
      "keyword": "quantum computing",
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

Deep read URL content with auto Puppeteer fallback.

**Key Parameters:**
- `url` (string, required): URL to read
- `maxLength` (number, optional): Max characters (default: 3000)
- `section` (string, optional): Extract specific heading

## Installation

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

## Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SEARXNG_URL` | Yes | - | SearXNG instance URL |
| `ENABLE_EMBEDDING` | No | `false` | Enable hybrid retrieval |
| `ENABLE_CACHE` | No | `false` | Enable caching |
| `OLLAMA_HOST` | No | `http://localhost:11434` | Ollama server URL |
| `MAX_KEYWORDS` | No | `5` | Max keywords per search |
| `MAX_DESCRIPTION_LENGTH` | No | `300` | Max description chars |

**Full configuration:** [CONFIGURATION.md](./CONFIGURATION.md)

## Features

### Hybrid Retrieval
- BM25 (30%) + Embedding (70%) for better relevance
- Requires Ollama with embedding model

### Semantic Caching
- 0.95 similarity threshold
- Session isolation + global sharing
- TTL-based expiration

### Content Reading
- Auto Puppeteer fallback for JavaScript sites
- Mozilla Readability extraction
- HTML to Markdown conversion

## Development

```bash
npm install
npm run watch    # Dev mode
npm run build    # Build
npm test         # Test
```

## Links

- [Upstream](https://github.com/ihor-sokoliuk/mcp-searxng)
- [SearXNG](https://docs.searxng.org)
- [MCP Protocol](https://modelcontextprotocol.io)
- [Ollama](https://ollama.com)
