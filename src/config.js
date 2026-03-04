/**
 * Configuration loader for wct-migration-mcp-server.
 */

export const port = parseInt(process.env.PORT || '3001', 10);
export const transport = process.env.MCP_TRANSPORT || 'stdio'; // 'stdio' | 'http'
export const dbPath = process.env.DB_PATH || './data/migration-cache.db';
export const nugetApiUrl = process.env.NUGET_API_URL || 'https://api.nuget.org/v3/index.json';
export const wctWikiUrl = process.env.WCT_WIKI_URL || 'https://raw.githubusercontent.com/wiki/CommunityToolkit/Windows/Migration-Guide-from-v7-to-v8.md';
export const msLearnBase = process.env.MS_LEARN_BASE || 'https://learn.microsoft.com/en-us/windows/communitytoolkit/';
export const cacheTtlHours = parseInt(process.env.CACHE_TTL_HOURS || '168', 10);
