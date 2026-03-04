/**
 * NuGet API v3 client for resolving WCT package metadata and types.
 */

import fetch from 'node-fetch';

const NUGET_INDEX_URL = 'https://api.nuget.org/v3/index.json';
const NUGET_FLAT_BASE = 'https://api.nuget.org/v3-flatcontainer';
const NUGET_SEARCH_BASE = 'https://azuresearch-usnc.nuget.org/query';

let _serviceIndex = null;

async function getServiceIndex() {
  if (_serviceIndex) return _serviceIndex;
  try {
    const res = await fetch(NUGET_INDEX_URL, { timeout: 10000 });
    if (!res.ok) throw new Error(`NuGet index failed: ${res.status}`);
    _serviceIndex = await res.json();
    return _serviceIndex;
  } catch (err) {
    console.error('NuGet service index unavailable:', err.message);
    return null;
  }
}

/**
 * Fetch the nuspec for a specific package version.
 */
export async function fetchNuspec(packageId, version) {
  const id = packageId.toLowerCase();
  const ver = version.toLowerCase();
  const url = `${NUGET_FLAT_BASE}/${id}/${ver}/${id}.nuspec`;
  try {
    const res = await fetch(url, { timeout: 10000 });
    if (!res.ok) return null;
    return await res.text();
  } catch (err) {
    console.error(`NuGet nuspec fetch failed for ${packageId}@${version}:`, err.message);
    return null;
  }
}

/**
 * Search NuGet for packages matching a query.
 */
export async function searchPackages(query, prerelease = false) {
  const url = `${NUGET_SEARCH_BASE}?q=${encodeURIComponent(query)}&prerelease=${prerelease}&take=10`;
  try {
    const res = await fetch(url, { timeout: 10000 });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.error('NuGet search failed:', err.message);
    return [];
  }
}

/**
 * Get the latest stable version of a package.
 */
export async function getLatestVersion(packageId) {
  const id = packageId.toLowerCase();
  const url = `${NUGET_FLAT_BASE}/${id}/index.json`;
  try {
    const res = await fetch(url, { timeout: 10000 });
    if (!res.ok) return null;
    const json = await res.json();
    // Filter out pre-release versions and return the last stable one
    const stable = (json.versions || []).filter((v) => !v.includes('-'));
    return stable.length > 0 ? stable[stable.length - 1] : null;
  } catch (err) {
    console.error(`NuGet version lookup failed for ${packageId}:`, err.message);
    return null;
  }
}

/**
 * List all versions of a package.
 */
export async function listVersions(packageId) {
  const id = packageId.toLowerCase();
  const url = `${NUGET_FLAT_BASE}/${id}/index.json`;
  try {
    const res = await fetch(url, { timeout: 10000 });
    if (!res.ok) return [];
    const json = await res.json();
    return json.versions || [];
  } catch (err) {
    console.error(`NuGet version list failed for ${packageId}:`, err.message);
    return [];
  }
}
