/**
 * wct-migration-mcp-server — entry point.
 *
 * Runs as:
 *   stdio  (default)  – for local Copilot / VS Code / Visual Studio MCP config
 *   http               – for Docker Compose / remote use (set MCP_TRANSPORT=http)
 *
 * Tools exposed:
 *   search_docs      – search WCT documentation for APIs/controls across versions
 *   fetch_article    – fetch full documentation for a specific API
 *   find_equivalent  – find the v8.x equivalent of a v7.1.1 API (with SQLite cache)
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import { z } from 'zod';

import { port, transport, dbPath } from './config.js';
import { getDb } from './db.js';
import { handleSearchDocs } from './tools/search-docs.js';
import { handleFetchArticle } from './tools/fetch-article.js';
import { handleFindEquivalent } from './tools/find-equivalent.js';

// ---------------------------------------------------------------------------
// Build the MCP server
// ---------------------------------------------------------------------------
function createServer() {
  const server = new McpServer({
    name: 'wct-migration-mcp-server',
    version: '1.0.0',
  });

  // ── search_docs ────────────────────────────────────────────────────────────
  server.tool(
    'search_docs',
    'Search Windows Community Toolkit documentation for APIs, controls, or classes across versions.',
    {
      query: z.string().min(1).describe('API name, class name, control name, or keyword'),
      package_name: z.string().optional().describe('NuGet package name to scope the search'),
      version: z.string().optional().default('7.1.1').describe("WCT version: '7.1.1' or '8.x'"),
    },
    async (args) => handleSearchDocs(args)
  );

  // ── fetch_article ──────────────────────────────────────────────────────────
  server.tool(
    'fetch_article',
    'Fetch full documentation (members, usage examples, remarks) for a specific WCT API.',
    {
      api_name: z.string().describe("Fully qualified or simple type name, e.g., 'AdaptiveGridView'"),
      package_name: z.string().optional().describe('NuGet package name'),
      version: z.string().optional().default('8.x').describe('Documentation version to fetch'),
    },
    async (args) => handleFetchArticle(args)
  );

  // ── find_equivalent ────────────────────────────────────────────────────────
  server.tool(
    'find_equivalent',
    'Find the v8.x equivalent of a v7.1.1 Windows Community Toolkit API. Results are cached in SQLite for instant re-serving.',
    {
      api_name: z.string().describe("v7 API name (e.g., 'AdaptiveGridView', 'InAppNotification')"),
      package_name: z.string().optional().describe("v7 NuGet package (e.g., 'Microsoft.Toolkit.Uwp.UI.Controls')"),
      source_version: z.string().optional().default('7.1.1').describe('Source WCT version'),
      target_version: z.string().optional().default('8.x').describe('Target WCT version'),
    },
    async (args) => handleFindEquivalent(args)
  );

  return server;
}

// ---------------------------------------------------------------------------
// Start in the requested transport mode
// ---------------------------------------------------------------------------
async function main() {
  // Ensure DB is initialized on startup
  getDb(dbPath);

  if (transport === 'http') {
    const app = express();
    app.use(express.json());

    app.post('/mcp', async (req, res) => {
      const server = createServer();
      const t = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
      res.on('close', () => t.close());
      await server.connect(t);
      await t.handleRequest(req, res, req.body);
    });

    app.get('/health', (_req, res) =>
      res.json({ status: 'ok', server: 'wct-migration-mcp-server', version: '1.0.0' })
    );

    app.listen(port, () => {
      console.error(`wct-migration-mcp-server (HTTP) listening on port ${port}`);
      console.error(`Health: http://localhost:${port}/health`);
      console.error(`MCP endpoint: http://localhost:${port}/mcp`);
    });
  } else {
    const server = createServer();
    const t = new StdioServerTransport();
    await server.connect(t);
    console.error('wct-migration-mcp-server (stdio) started');
  }
}

main().catch((err) => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
