/**
 * search_docs tool — search WCT documentation for an API/class/control.
 */

import { searchDocs } from '../migration-engine.js';

export async function handleSearchDocs({ query, package_name, version }) {
  const ver = version || '7.1.1';
  const results = await searchDocs(query, package_name || '', ver);

  if (results.length === 0) {
    return {
      content: [{ type: 'text', text: `No results found for "${query}" in WCT ${ver}.` }],
    };
  }

  const lines = results.map((r) => {
    const parts = [`### ${r.api_name || r.title || query}`];
    if (r.package_name) parts.push(`**Package:** ${r.package_name}`);
    if (r.namespace) parts.push(`**Namespace:** ${r.namespace}`);
    if (r.description) parts.push(`\n${r.description}`);
    if (r.url) parts.push(`\n**Docs:** [${r.url}](${r.url})`);
    return parts.join('\n');
  });

  return {
    content: [{
      type: 'text',
      text: `## WCT ${ver} — Search results for "${query}"\n\n${lines.join('\n\n---\n\n')}`,
    }],
  };
}
