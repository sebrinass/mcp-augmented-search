FROM node:lts-alpine AS builder

WORKDIR /app

COPY ./ /app

RUN --mount=type=cache,target=/root/.npm npm run bootstrap

FROM node:lts-alpine AS release

ARG ENABLE_PUPPETEER=false

RUN apk update && apk upgrade && \
    apk add --no-cache \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

RUN if [ "$ENABLE_PUPPETEER" = "true" ]; then \
    apk add --no-cache chromium; \
    fi

WORKDIR /app

COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/package-lock.json /app/package-lock.json

ENV NODE_ENV=production
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

RUN if [ "$ENABLE_PUPPETEER" = "true" ]; then \
    export PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser; \
    npm ci --ignore-scripts --omit-dev; \
    else \
    npm ci --ignore-scripts --omit-dev; \
    fi

ENV SEARXNG_URL=http://localhost:8080
ENV MCP_HTTP_PORT=1234
ENV ENABLE_EMBEDDING=true
ENV OLLAMA_HOST=http://localhost:11434
ENV EMBEDDING_MODEL=nomic-embed-text
ENV TOP_K=3
ENV CHUNK_SIZE=1000
ENV CHUNK_OVERLAP=100
ENV ENABLE_CACHE=true
ENV CACHE_TTL=300
ENV CACHE_MAX_SIZE=1000
ENV CACHE_SEARCH=true
ENV CACHE_EMBEDDING=true

EXPOSE 1234

ENTRYPOINT ["node", "dist/index.js"]