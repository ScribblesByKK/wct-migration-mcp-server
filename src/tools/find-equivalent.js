/**
 * find_equivalent tool — find the v8.x equivalent of a v7.1.1 WCT API.
 */

import { findEquivalent } from '../migration-engine.js';

export async function handleFindEquivalent({ api_name, package_name, source_version, target_version }) {
  const result = await findEquivalent(
    api_name,
    package_name || '',
    source_version || '7.1.1',
    target_version || '8.x'
  );

  const lines = [
    `## Migration: \`${result.old_api}\``,
    '',
    `| Field | Value |`,
    `|-------|-------|`,
    `| **Status** | \`${result.status}\` |`,
    `| **v7 API** | \`${result.old_api}\` |`,
    `| **v7 Package** | \`${result.old_package || 'N/A'}\` |`,
    `| **v7 Namespace** | \`${result.old_namespace || 'N/A'}\` |`,
    `| **v8 API** | \`${result.new_api || 'N/A'}\` |`,
    `| **v8 Package** | \`${result.new_package || 'N/A'}\` |`,
    `| **v8 Namespace** | \`${result.new_namespace || 'N/A'}\` |`,
    '',
  ];

  if (result.migration_notes) {
    lines.push('### Migration Notes', '', result.migration_notes, '');
  }

  if (result.usage_example) {
    lines.push('### Usage Example', '', result.usage_example, '');
  }

  if (result.breaking_changes) {
    lines.push('### Breaking Changes', '', result.breaking_changes, '');
  }

  if (result.reference_url) {
    lines.push('### Reference', '', `📖 [Official Documentation](${result.reference_url})`, '');
  }

  return {
    content: [{ type: 'text', text: lines.join('\n') }],
  };
}
