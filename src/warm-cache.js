/**
 * Cache warm-up script for wct-migration-mcp-server.
 *
 * Pre-populates the SQLite DB with all known v7.1.1 → v8.x migration mappings.
 * Runs directly against the migration engine (no MCP overhead).
 *
 * Usage:
 *   DB_PATH=./data/migration-cache.db node src/warm-cache.js
 *   docker exec -it wct-migration-mcp-server node src/warm-cache.js
 */

import { findEquivalent } from './migration-engine.js';
import { getDb, getAllMappings } from './db.js';
import { dbPath } from './config.js';
import { KNOWN_API_MAPPINGS } from './seed-data.js';

const SOURCE_VERSION = '7.1.1';
const TARGET_VERSION = '8.x';

async function main() {
  console.log('🔥 WCT Migration Cache Warm-Up');
  console.log(`   DB: ${dbPath}\n`);

  // Ensure DB is initialized with seed data
  const db = getDb(dbPath);

  const apis = KNOWN_API_MAPPINGS.filter((m) => m.old_api);
  console.log(`Found ${apis.length} APIs to warm...\n`);

  let cached = 0;
  let fetched = 0;
  let failed = 0;

  for (const api of apis) {
    const name = api.old_api;
    const pkg = api.old_package || '';
    process.stdout.write(`  ${name} (${pkg})... `);

    try {
      const result = await findEquivalent(name, pkg, SOURCE_VERSION, TARGET_VERSION);
      if (result.status !== 'unknown') {
        console.log(`✅ ${result.status}`);
        cached++;
      } else {
        console.log(`⚠️  unknown`);
        fetched++;
      }
    } catch (err) {
      console.log(`❌ ${err.message}`);
      failed++;
    }
  }

  // Report
  const total = getAllMappings(db).length;
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`✅ Processed: ${cached + fetched}  ❌ Failed: ${failed}`);
  console.log(`📦 Total mappings in DB: ${total}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
}

main().catch((err) => {
  console.error('Warm-up error:', err.message);
  process.exit(1);
});
