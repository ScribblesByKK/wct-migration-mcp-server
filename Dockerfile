FROM node:22-alpine

# better-sqlite3 requires build tools
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src

# Create data directory for SQLite
RUN mkdir -p /app/data

ENV MCP_TRANSPORT=http
ENV PORT=3001
ENV DB_PATH=/app/data/migration-cache.db

EXPOSE 3001

VOLUME ["/app/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://localhost:3001/health || exit 1

CMD ["node", "src/index.js"]
