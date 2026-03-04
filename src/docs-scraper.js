/**
 * Documentation scraper for MS Learn and GitHub wiki pages.
 * Uses cheerio for HTML parsing and turndown for Markdown conversion.
 */

import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';

const td = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });

const MS_LEARN_API_BASE = 'https://learn.microsoft.com/en-us/dotnet/api/';
const WCT_WIKI_RAW = 'https://raw.githubusercontent.com/wiki/CommunityToolkit/Windows/Migration-Guide-from-v7-to-v8.md';
const MS_LEARN_WCT_BASE = 'https://learn.microsoft.com/en-us/windows/communitytoolkit/';

/**
 * Fetch any URL and convert its main content to Markdown.
 */
export async function fetchAndConvert(url) {
  try {
    const res = await fetch(url, {
      timeout: 15000,
      headers: { 'User-Agent': 'wct-migration-mcp-server/1.0' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    return htmlToMarkdown(html, url);
  } catch (err) {
    console.error(`fetchAndConvert failed for ${url}:`, err.message);
    return null;
  }
}

/**
 * Convert HTML to Markdown, extracting only the main content area.
 */
export function htmlToMarkdown(html, sourceUrl = '') {
  const $ = cheerio.load(html);

  // Remove noise elements
  $('nav, header, footer, .header, .footer, .sidebar, .toc, script, style, [aria-hidden="true"]').remove();

  // Try to extract the main content region
  const mainSelectors = ['main', 'article', '#main-content', '.content', '[role="main"]', 'body'];
  let content = '';
  for (const sel of mainSelectors) {
    const el = $(sel).first();
    if (el.length && el.text().trim().length > 100) {
      content = td.turndown(el.html() || '');
      break;
    }
  }

  if (!content) content = td.turndown($('body').html() || html);
  return content;
}

/**
 * Fetch the WCT migration wiki page (raw markdown).
 */
export async function fetchMigrationWiki() {
  try {
    const res = await fetch(WCT_WIKI_RAW, {
      timeout: 15000,
      headers: { 'User-Agent': 'wct-migration-mcp-server/1.0' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch (err) {
    console.error('Failed to fetch migration wiki:', err.message);
    return null;
  }
}

/**
 * Build a MS Learn API documentation URL for a given type.
 * Tries both WCT v7 and v8 views.
 */
export function buildMsLearnUrl(apiName, version = '8.x') {
  // Normalize: if fully qualified, use as-is; otherwise use bare name
  const qualified = apiName.includes('.')
    ? apiName.toLowerCase()
    : `communitytoolkit.winui.controls.${apiName.toLowerCase()}`;

  const viewParam = version.startsWith('7')
    ? '?view=win-comm-toolkit-dotnet-7.0'
    : '?view=win-comm-toolkit-dotnet-stable';

  return `${MS_LEARN_API_BASE}${qualified}${viewParam}`;
}

/**
 * Fetch MS Learn documentation for a specific API.
 */
export async function fetchMsLearnDoc(apiName, version = '8.x') {
  const url = buildMsLearnUrl(apiName, version);
  const markdown = await fetchAndConvert(url);
  return { url, markdown };
}

/**
 * Search MS Learn for WCT-related documentation.
 */
export async function searchMsLearnDocs(query, version = '8.x') {
  const searchUrl = `https://learn.microsoft.com/api/search?search=${encodeURIComponent(query + ' windows community toolkit')}&locale=en-us&$top=5`;
  try {
    const res = await fetch(searchUrl, {
      timeout: 10000,
      headers: { 'User-Agent': 'wct-migration-mcp-server/1.0' },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.results || []).map((r) => ({
      title: r.title,
      url: r.url,
      summary: r.description || '',
    }));
  } catch (err) {
    console.error('MS Learn search failed:', err.message);
    return [];
  }
}
