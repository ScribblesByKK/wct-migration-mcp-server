/**
 * Core migration engine for WCT v7.1.1 → v8.x.
 * Implements the find_equivalent logic: cache-first, then live lookup.
 */

import { getDb, lookupMapping, insertMapping, lookupDocsCache, insertDocsCache, lookupArticleCache, insertArticleCache } from './db.js';
import { KNOWN_PACKAGE_MAPPINGS, KNOWN_API_MAPPINGS } from './seed-data.js';
import { fetchNuspec, getLatestVersion } from './nuget-client.js';
import { fetchMsLearnDoc, searchMsLearnDocs, fetchMigrationWiki } from './docs-scraper.js';
import { dbPath } from './config.js';

function db() { return getDb(dbPath); }

/**
 * Find the v8.x equivalent of a v7.1.1 API.
 * Returns a structured migration result.
 */
export async function findEquivalent(apiName, packageName, sourceVersion = '7.1.1', targetVersion = '8.x') {
  const d = db();

  // 1. Cache hit?
  const cached = lookupMapping(d, apiName, packageName || '', sourceVersion, targetVersion);
  if (cached) {
    return formatMappingResult(cached);
  }

  // 2. Check hardcoded seed for exact match (may not be in DB yet if first-run seeding missed it)
  const seedMatch = KNOWN_API_MAPPINGS.find(
    (m) => m.old_api === apiName && (!packageName || m.old_package === packageName)
  );
  if (seedMatch) {
    const row = {
      old_api: seedMatch.old_api,
      old_package: seedMatch.old_package || packageName || '',
      old_namespace: seedMatch.old_namespace || seedMatch.old_package || '',
      source_version: sourceVersion,
      new_api: seedMatch.new_api || null,
      new_package: seedMatch.new_package || null,
      new_namespace: seedMatch.new_namespace || null,
      target_version: targetVersion,
      status: seedMatch.status,
      migration_notes: seedMatch.notes || '',
      usage_example: seedMatch.usage_example || '',
      breaking_changes: seedMatch.breaking_changes || '',
    };
    insertMapping(d, row);
    return formatMappingResult(row);
  }

  // 3. Try to resolve via package mapping
  const pkgMapping = KNOWN_PACKAGE_MAPPINGS.find((p) => p.old === packageName);
  const newPackage = pkgMapping ? pkgMapping.new : null;

  if (pkgMapping && !pkgMapping.new) {
    // Package removed with no v8 equivalent
    const row = {
      old_api: apiName,
      old_package: packageName || '',
      old_namespace: packageName || '',
      source_version: sourceVersion,
      new_api: null,
      new_package: null,
      new_namespace: null,
      target_version: targetVersion,
      status: 'removed_no_replacement',
      migration_notes: pkgMapping.notes || `${packageName} was not ported to v8.`,
      usage_example: '',
      breaking_changes: 'Package was not ported to v8.',
    };
    insertMapping(d, row);
    return formatMappingResult(row);
  }

  // 4. Live network lookup: search MS Learn docs
  let migrationNotes = '';
  let usageExample = '';
  let breakingChanges = '';
  let status = 'unknown';
  let newApi = apiName; // assume same name unless we find otherwise

  try {
    const searchResults = await searchMsLearnDocs(apiName, targetVersion);
    if (searchResults.length > 0) {
      status = newPackage ? 'direct_rename' : 'unknown';
      migrationNotes = `See: ${searchResults[0].url}`;
    }
  } catch (err) {
    console.error('Live search failed:', err.message);
  }

  // If we mapped the package, assume direct rename (namespace change)
  if (newPackage && status === 'unknown') {
    status = 'direct_rename';
  }

  const newNamespace = newPackage
    ? newPackage.replace('CommunityToolkit.WinUI.', 'CommunityToolkit.WinUI.')
    : null;

  const row = {
    old_api: apiName,
    old_package: packageName || '',
    old_namespace: packageName || '',
    source_version: sourceVersion,
    new_api: newApi,
    new_package: newPackage,
    new_namespace: newNamespace,
    target_version: targetVersion,
    status,
    migration_notes: migrationNotes || (newPackage ? `Package renamed to ${newPackage}.` : 'No v8 equivalent found.'),
    usage_example: usageExample,
    breaking_changes: breakingChanges,
  };

  insertMapping(d, row);
  return formatMappingResult(row);
}

/**
 * Search for documentation about a WCT API across versions.
 */
export async function searchDocs(query, packageName = '', version = '7.1.1') {
  const d = db();

  // Cache hit
  const cached = lookupDocsCache(d, query, version, packageName);
  if (cached) {
    return JSON.parse(cached.results_json);
  }

  const results = [];

  // Search seed data first (fast, offline)
  const seedMatches = KNOWN_API_MAPPINGS.filter((m) => {
    const api = version.startsWith('7') ? m.old_api : m.new_api;
    if (!api) return false;
    return api.toLowerCase().includes(query.toLowerCase());
  });

  for (const m of seedMatches) {
    const api = version.startsWith('7') ? m.old_api : m.new_api;
    const pkg = version.startsWith('7') ? m.old_package : m.new_package;
    if (api) {
      results.push({
        api_name: api,
        package_name: pkg || '',
        namespace: version.startsWith('7') ? m.old_namespace || pkg : m.new_namespace || pkg,
        description: m.notes || '',
        version,
        source: 'seed',
      });
    }
  }

  // Live search on MS Learn if we have network
  try {
    const liveResults = await searchMsLearnDocs(query, version);
    for (const r of liveResults) {
      results.push({
        api_name: query,
        package_name: packageName,
        namespace: '',
        description: r.summary || '',
        url: r.url,
        title: r.title,
        version,
        source: 'ms-learn',
      });
    }
  } catch (err) {
    console.error('MS Learn search failed:', err.message);
  }

  // Cache
  const json = JSON.stringify(results);
  insertDocsCache(d, query, version, packageName, json, null);

  return results;
}

/**
 * Fetch full article documentation for a specific API.
 */
export async function fetchArticle(apiName, packageName = '', version = '8.x') {
  const d = db();

  // Cache hit
  const cached = lookupArticleCache(d, apiName, version, packageName);
  if (cached) {
    return { markdown: cached.markdown, source_url: cached.source_url };
  }

  // Try MS Learn
  const { url, markdown } = await fetchMsLearnDoc(apiName, version);

  let content = markdown;
  if (!content) {
    // Fallback: generate from seed data
    const seedMatch = KNOWN_API_MAPPINGS.find(
      (m) => (version.startsWith('7') ? m.old_api : m.new_api) === apiName
    );
    if (seedMatch) {
      content = [
        `# ${apiName}`,
        '',
        `**Package:** ${version.startsWith('7') ? seedMatch.old_package : seedMatch.new_package || 'N/A'}`,
        '',
        `**Status:** ${seedMatch.status}`,
        '',
        seedMatch.notes ? `## Notes\n\n${seedMatch.notes}` : '',
        seedMatch.usage_example ? `## Usage Example\n\n${seedMatch.usage_example}` : '',
        seedMatch.breaking_changes ? `## Breaking Changes\n\n${seedMatch.breaking_changes}` : '',
      ].filter(Boolean).join('\n');
    } else {
      content = `# ${apiName}\n\nNo documentation found for ${apiName} version ${version}.`;
    }
  }

  insertArticleCache(d, apiName, packageName, version, content, url || '', null);
  return { markdown: content, source_url: url || '' };
}

function formatMappingResult(row) {
  return {
    old_api: row.old_api,
    old_package: row.old_package,
    old_namespace: row.old_namespace,
    new_api: row.new_api,
    new_package: row.new_package,
    new_namespace: row.new_namespace,
    status: row.status,
    migration_notes: row.migration_notes,
    usage_example: row.usage_example,
    breaking_changes: row.breaking_changes,
    reference_url: row.reference_url || '',
    source_version: row.source_version,
    target_version: row.target_version,
  };
}
