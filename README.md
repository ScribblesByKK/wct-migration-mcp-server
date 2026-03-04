# WCT Migration MCP Server

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server that provides AI-powered migration assistance for upgrading projects from **Windows Community Toolkit v7.1.1** to **v8.x**.

Use it with **GitHub Copilot in Visual Studio**, **VS Code**, or any MCP-compatible client to let AI find API equivalents, fetch documentation, and guide WCT migration — backed by a persistent SQLite cache for instant re-serving.

---

## Features

| Tool | Description |
|---|---|
| `search_docs` | Search WCT documentation for APIs, controls, or classes across versions |
| `fetch_article` | Fetch full documentation (members, examples, remarks) for a specific API |
| `find_equivalent` | Find the v8.x equivalent of any v7.1.1 API — results cached in SQLite |

- **Persistent SQLite cache** — results cached locally for instant re-serving, zero network calls on repeat queries
- **Offline-capable** — ships with hardcoded seed data covering all major v7→v8 migrations
- **Docker Compose** — one command to run locally or on a home server
- **Pre-built image on GHCR** — `ghcr.io/scribblesbykk/wct-migration-mcp-server:latest`
- **stdio transport** — works directly with VS / VS Code Copilot without a network server
- **HTTP transport** — for Docker or remote deployments (Streamable HTTP, MCP spec §5.2)

---

## Quick Start

### stdio (recommended for local Copilot use)

```bash
node src/index.js
```

### Docker – pre-built image (fastest)

```bash
docker run -d \
  --name wct-migration-mcp-server \
  -p 3001:3001 \
  -v wct-data:/app/data \
  ghcr.io/scribblesbykk/wct-migration-mcp-server:latest
```

The MCP endpoint is available at `http://localhost:3001/mcp`.

### Docker Compose

```bash
docker compose up -d
```

The MCP endpoint is available at `http://localhost:3001/mcp`.

---

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `MCP_TRANSPORT` | No | `stdio` | `stdio` or `http` |
| `PORT` | No | `3001` | HTTP server port |
| `DB_PATH` | No | `./data/migration-cache.db` | Path to SQLite database |
| `NUGET_API_URL` | No | `https://api.nuget.org/v3/index.json` | NuGet service index |
| `WCT_WIKI_URL` | No | GitHub wiki URL | Migration wiki URL |
| `MS_LEARN_BASE` | No | `https://learn.microsoft.com/...` | MS Learn docs base |
| `CACHE_TTL_HOURS` | No | `168` (7 days) | Cache freshness TTL |

---

## Connecting to GitHub Copilot

### Visual Studio 2022 (17.13+)

Add to `.github/copilot-mcp.json` in your solution:

```json
{
  "servers": {
    "wct-migration": {
      "command": "node",
      "args": ["${workspaceFolder}/path/to/wct-migration-mcp-server/src/index.js"]
    }
  }
}
```

Or using HTTP transport (Docker):

```json
{
  "servers": {
    "wct-migration": {
      "type": "http",
      "url": "http://localhost:3001/mcp"
    }
  }
}
```

### VS Code

Add to `.vscode/mcp.json` in your workspace:

```json
{
  "servers": {
    "wct-migration": {
      "type": "http",
      "url": "http://localhost:3001/mcp"
    }
  }
}
```

---

## Using the Tools in Copilot Chat

Once configured, you can ask Copilot:

```
What's the v8 equivalent of AdaptiveGridView?
Find the migration path for InAppNotification.
Search WCT docs for BladeView.
Fetch the v8 docs for WrapPanel.
```

Or naturally:
> "I'm migrating from WCT 7.1.1 to 8. What happened to DropShadowPanel?"

---

## Package Mappings (v7.1.1 → v8.x)

| v7.1.1 Package | v8.x Package |
|---|---|
| `Microsoft.Toolkit.Uwp` | `CommunityToolkit.WinUI` |
| `Microsoft.Toolkit.Uwp.UI.Controls` | `CommunityToolkit.WinUI.Controls` |
| `Microsoft.Toolkit.Uwp.UI.Controls.DataGrid` | ❌ Not ported |
| `Microsoft.Toolkit.Uwp.UI.Animations` | `CommunityToolkit.WinUI.Animations` |
| `Microsoft.Toolkit.Uwp.UI.Behaviors` | `CommunityToolkit.WinUI.Behaviors` |
| `Microsoft.Toolkit.Uwp.UI.Media` | `CommunityToolkit.WinUI.Media` |
| `Microsoft.Toolkit.Uwp.Notifications` | `CommunityToolkit.WinUI.Notifications` |
| `Microsoft.Toolkit.Uwp.DeveloperTools` | `CommunityToolkit.WinUI.DeveloperTools` |
| `Microsoft.Toolkit.Uwp.Connectivity` | `CommunityToolkit.WinUI.Connectivity` |

---

## How It Works

1. **First call** to `find_equivalent` checks SQLite cache → on miss, resolves via seed data and live MS Learn/NuGet lookups → persists result
2. **Subsequent calls** return instantly from SQLite — no network needed
3. **Seed data** covers all major v7→v8 API changes (50+ controls/APIs) so most queries are served offline
4. **Cache warm-up** script pre-populates the entire DB in one run

---

## Cache Warm-Up

Pre-populate the SQLite database with all known v7→v8 mappings:

```bash
# Local
npm run warm-cache

# Docker
docker exec -it wct-migration-mcp-server node src/warm-cache.js
```

---

## Migration Script

A PowerShell script automates bulk migration of WinUI solutions:

```powershell
.\scripts\Migrate-WctWorkspace.ps1 -SolutionPath .\MySolution.sln
```

The script:
1. Scans `.csproj` files for WCT v7 `PackageReference` entries
2. Calls `find_equivalent` on the MCP server for each
3. Updates package references, `using` directives, and XAML `xmlns` declarations
4. Runs a build-fix loop (up to 20 iterations) resolving compiler errors via MCP tools

---

## Development

```bash
npm install

# Run locally (stdio)
node src/index.js

# Run locally (HTTP)
MCP_TRANSPORT=http node src/index.js

# Smoke tests
npm test

# Cache warm-up
npm run warm-cache
```

---

## MCP Server Config for Copilot CLI

Add to `~/.config/github-copilot/mcp.json`:

```json
{
  "servers": {
    "wct-migration": {
      "type": "http",
      "url": "http://localhost:3001/mcp"
    }
  }
}
```

---

## License

MIT
