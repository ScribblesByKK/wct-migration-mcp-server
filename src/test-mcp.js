/**
 * Smoke tests for wct-migration-mcp-server.
 *
 * Starts the server in-process via stdio transport and exercises all three tools.
 *
 * Usage:
 *   node src/test-mcp.js
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

console.log('\n🧪  wct-migration-mcp-server test suite\n');

async function runTests() {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ['src/index.js'],
    env: { ...process.env },
  });

  const client = new Client({ name: 'test-client', version: '1.0.0' });
  await client.connect(transport);

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  ✅  ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌  ${name}: ${err.message}`);
      failed++;
    }
  }

  // ── Tool discovery ─────────────────────────────────────────────────────────
  await test('Server advertises expected tools', async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);
    for (const expected of ['search_docs', 'fetch_article', 'find_equivalent']) {
      if (!names.includes(expected)) throw new Error(`Missing tool: ${expected}`);
    }
  });

  // ── search_docs ────────────────────────────────────────────────────────────
  await test('search_docs returns results for "AdaptiveGridView" v7.1.1', async () => {
    const result = await client.callTool({
      name: 'search_docs',
      arguments: { query: 'AdaptiveGridView', version: '7.1.1' },
    });
    const text = result.content?.[0]?.text || '';
    if (!text.includes('AdaptiveGridView')) throw new Error(`Unexpected response: ${text.slice(0, 200)}`);
  });

  await test('search_docs returns results for "BladeView" v7.1.1', async () => {
    const result = await client.callTool({
      name: 'search_docs',
      arguments: { query: 'BladeView', version: '7.1.1' },
    });
    const text = result.content?.[0]?.text || '';
    if (!text.includes('BladeView')) throw new Error(`Unexpected response: ${text.slice(0, 200)}`);
  });

  // ── find_equivalent ────────────────────────────────────────────────────────
  await test('find_equivalent: AdaptiveGridView → removed_with_replacement', async () => {
    const result = await client.callTool({
      name: 'find_equivalent',
      arguments: {
        api_name: 'AdaptiveGridView',
        package_name: 'Microsoft.Toolkit.Uwp.UI.Controls',
      },
    });
    const text = result.content?.[0]?.text || '';
    if (!text.includes('removed_with_replacement')) throw new Error(`Unexpected status: ${text.slice(0, 300)}`);
  });

  await test('find_equivalent: BladeView → direct_rename', async () => {
    const result = await client.callTool({
      name: 'find_equivalent',
      arguments: {
        api_name: 'BladeView',
        package_name: 'Microsoft.Toolkit.Uwp.UI.Controls',
      },
    });
    const text = result.content?.[0]?.text || '';
    if (!text.includes('direct_rename')) throw new Error(`Unexpected: ${text.slice(0, 300)}`);
  });

  await test('find_equivalent: Expander → moved_to_winui', async () => {
    const result = await client.callTool({
      name: 'find_equivalent',
      arguments: {
        api_name: 'Expander',
        package_name: 'Microsoft.Toolkit.Uwp.UI.Controls',
      },
    });
    const text = result.content?.[0]?.text || '';
    if (!text.includes('moved_to_winui')) throw new Error(`Unexpected: ${text.slice(0, 300)}`);
  });

  await test('find_equivalent: DataGrid → removed_no_replacement', async () => {
    const result = await client.callTool({
      name: 'find_equivalent',
      arguments: {
        api_name: 'DataGrid',
        package_name: 'Microsoft.Toolkit.Uwp.UI.Controls.DataGrid',
      },
    });
    const text = result.content?.[0]?.text || '';
    if (!text.includes('removed_no_replacement')) throw new Error(`Unexpected: ${text.slice(0, 300)}`);
  });

  await test('find_equivalent: second call returns from cache (same result)', async () => {
    const args = {
      api_name: 'WrapPanel',
      package_name: 'Microsoft.Toolkit.Uwp.UI.Controls',
    };
    const first = await client.callTool({ name: 'find_equivalent', arguments: args });
    const second = await client.callTool({ name: 'find_equivalent', arguments: args });
    const t1 = first.content?.[0]?.text || '';
    const t2 = second.content?.[0]?.text || '';
    if (t1 !== t2) throw new Error('Cache miss: repeated call returned different result');
  });

  // ── fetch_article ──────────────────────────────────────────────────────────
  await test('fetch_article returns content for a known v8 control', async () => {
    const result = await client.callTool({
      name: 'fetch_article',
      arguments: { api_name: 'WrapPanel', version: '8.x' },
    });
    const text = result.content?.[0]?.text || '';
    if (!text.includes('WrapPanel')) throw new Error(`Unexpected response: ${text.slice(0, 200)}`);
  });

  await client.close();

  console.log(`\n  ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error('Test runner error:', err.message);
  process.exit(1);
});
