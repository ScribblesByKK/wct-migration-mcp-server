/**
 * fetch_article tool — fetch full documentation for a specific WCT API.
 */

import { fetchArticle } from '../migration-engine.js';

export async function handleFetchArticle({ api_name, package_name, version }) {
  const ver = version || '8.x';
  const { markdown, source_url } = await fetchArticle(api_name, package_name || '', ver);

  const header = source_url
    ? `# ${api_name}\n\n**Source:** [${source_url}](${source_url})\n\n---\n\n`
    : `# ${api_name}\n\n---\n\n`;

  const maxLen = 8000;
  const truncated = markdown.length > maxLen;
  const text = truncated ? markdown.slice(0, maxLen) + '\n\n…(content truncated)' : markdown;

  return {
    content: [{ type: 'text', text: header + text }],
  };
}
