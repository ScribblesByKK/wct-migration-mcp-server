/**
 * SQLite wrapper for wct-migration-mcp-server.
 * Uses better-sqlite3 for synchronous, high-performance DB access.
 *
 * Handles schema creation, migrations, and seeding on first boot.
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { KNOWN_API_MAPPINGS } from './seed-data.js';

let _db = null;

export function getDb(dbPath) {
  if (_db) return _db;

  // Ensure the data directory exists
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  _db = new Database(dbPath);

  // WAL mode for better concurrent read performance
  _db.pragma('journal_mode = WAL');

  // Verify integrity on open
  const integrity = _db.pragma('integrity_check', { simple: true });
  if (integrity !== 'ok') {
    console.error('SQLite integrity check failed — rebuilding from seed');
    _db.close();
    fs.unlinkSync(dbPath);
    _db = new Database(dbPath);
    _db.pragma('journal_mode = WAL');
  }

  initSchema(_db);
  seedIfEmpty(_db);

  return _db;
}

function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS migration_mappings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      old_api TEXT NOT NULL,
      old_package TEXT NOT NULL,
      old_namespace TEXT DEFAULT '',
      source_version TEXT NOT NULL DEFAULT '7.1.1',
      new_api TEXT,
      new_package TEXT,
      new_namespace TEXT DEFAULT '',
      target_version TEXT NOT NULL DEFAULT '8.x',
      status TEXT NOT NULL DEFAULT 'unknown',
      migration_notes TEXT DEFAULT '',
      usage_example TEXT DEFAULT '',
      breaking_changes TEXT DEFAULT '',
      reference_url TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(old_api, old_package, source_version, target_version)
    );

    CREATE TABLE IF NOT EXISTS docs_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      query TEXT NOT NULL,
      version TEXT NOT NULL,
      package_name TEXT DEFAULT '',
      results_json TEXT NOT NULL,
      checksum TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(query, version, package_name)
    );

    CREATE TABLE IF NOT EXISTS article_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      api_name TEXT NOT NULL,
      package_name TEXT DEFAULT '',
      version TEXT NOT NULL,
      markdown TEXT NOT NULL,
      source_url TEXT DEFAULT '',
      checksum TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(api_name, version, package_name)
    );

    CREATE INDEX IF NOT EXISTS idx_mappings_lookup
      ON migration_mappings(old_api, old_package, source_version, target_version);
    CREATE INDEX IF NOT EXISTS idx_docs_lookup
      ON docs_cache(query, version);
    CREATE INDEX IF NOT EXISTS idx_article_lookup
      ON article_cache(api_name, version);
  `);

  // Add reference_url column to existing DBs that predate this field
  try { db.exec(`ALTER TABLE migration_mappings ADD COLUMN reference_url TEXT DEFAULT ''`); } catch (_) { /* already exists */ }
}

function seedIfEmpty(db) {
  const count = db.prepare('SELECT COUNT(*) AS cnt FROM migration_mappings').get();
  if (count.cnt > 0) return;

  const insert = db.prepare(`
    INSERT OR IGNORE INTO migration_mappings
      (old_api, old_package, old_namespace, source_version,
       new_api, new_package, new_namespace, target_version,
       status, migration_notes, usage_example, breaking_changes, reference_url)
    VALUES
      (@old_api, @old_package, @old_namespace, @source_version,
       @new_api, @new_package, @new_namespace, @target_version,
       @status, @migration_notes, @usage_example, @breaking_changes, @reference_url)
  `);

  const insertMany = db.transaction((mappings) => {
    for (const m of mappings) {
      // Only insert mappings with a known old_api (skip new_in_v8 entries without v7 equivalent)
      if (!m.old_api) continue;
      insert.run({
        old_api: m.old_api,
        old_package: m.old_package || '',
        old_namespace: m.old_namespace || m.old_package || '',
        source_version: '7.1.1',
        new_api: m.new_api || null,
        new_package: m.new_package || null,
        new_namespace: m.new_namespace || null,
        target_version: '8.x',
        status: m.status,
        migration_notes: m.notes || '',
        usage_example: m.usage_example || '',
        breaking_changes: m.breaking_changes || '',
        reference_url: m.reference_url || '',
      });
    }
  });

  insertMany(KNOWN_API_MAPPINGS);
  console.error(`DB seeded with ${KNOWN_API_MAPPINGS.filter((m) => m.old_api).length} known migration mappings`);
}

export function lookupMapping(db, oldApi, oldPackage, sourceVersion, targetVersion) {
  return db.prepare(`
    SELECT * FROM migration_mappings
    WHERE old_api = ? AND old_package = ? AND source_version = ? AND target_version = ?
    LIMIT 1
  `).get(oldApi, oldPackage, sourceVersion, targetVersion);
}

export function insertMapping(db, mapping) {
  return db.prepare(`
    INSERT OR REPLACE INTO migration_mappings
      (old_api, old_package, old_namespace, source_version,
       new_api, new_package, new_namespace, target_version,
       status, migration_notes, usage_example, breaking_changes, reference_url, updated_at)
    VALUES
      (@old_api, @old_package, @old_namespace, @source_version,
       @new_api, @new_package, @new_namespace, @target_version,
       @status, @migration_notes, @usage_example, @breaking_changes, @reference_url, datetime('now'))
  `).run(mapping);
}

export function lookupDocsCache(db, query, version, packageName = '') {
  return db.prepare(`
    SELECT * FROM docs_cache WHERE query = ? AND version = ? AND package_name = ?
  `).get(query, version, packageName);
}

export function insertDocsCache(db, query, version, packageName, resultsJson, checksum) {
  return db.prepare(`
    INSERT OR REPLACE INTO docs_cache (query, version, package_name, results_json, checksum)
    VALUES (?, ?, ?, ?, ?)
  `).run(query, version, packageName, resultsJson, checksum);
}

export function lookupArticleCache(db, apiName, version, packageName = '') {
  return db.prepare(`
    SELECT * FROM article_cache WHERE api_name = ? AND version = ? AND package_name = ?
  `).get(apiName, version, packageName);
}

export function insertArticleCache(db, apiName, packageName, version, markdown, sourceUrl, checksum) {
  return db.prepare(`
    INSERT OR REPLACE INTO article_cache (api_name, package_name, version, markdown, source_url, checksum)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(apiName, packageName, version, markdown, sourceUrl, checksum);
}

export function getAllMappings(db) {
  return db.prepare('SELECT * FROM migration_mappings ORDER BY old_api').all();
}
