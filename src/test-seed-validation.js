/**
 * Seed-data validation suite.
 *
 * Calls find_equivalent via the MCP stdio transport for every known API mapping
 * and asserts the returned status/new_api/new_package against ground-truth from
 * the official WCT v7→v8 migration guide:
 *   https://github.com/CommunityToolkit/Windows/wiki/Migration-Guide-from-v7-to-v8
 *
 * Usage:
 *   node src/test-seed-validation.js
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

console.log('\n🔍  wct-migration seed-data validation\n');

/**
 * Ground-truth assertions derived from:
 *  - https://github.com/CommunityToolkit/Windows/wiki/Migration-Guide-from-v7-to-v8
 *  - https://learn.microsoft.com/en-us/dotnet/communitytoolkit/windows/
 *  - NuGet package listings for CommunityToolkit.WinUI 8.x
 *
 * Each entry: { api, pkg, status, new_api, new_pkg }
 * null values are not asserted (only defined fields are checked).
 */
const GROUND_TRUTH = [
  // ── Moved to WinUI (removed from WCT, now in Microsoft.UI.Xaml / WinUI 2 for UWP) ─────────
  {
    api: 'Expander',
    pkg: 'Microsoft.Toolkit.Uwp.UI.Controls',
    status: 'moved_to_winui',
    new_api: 'Expander',
    new_pkg: 'Microsoft.UI.Xaml',
  },
  {
    api: 'RadialGradientBrush',
    pkg: 'Microsoft.Toolkit.Uwp.UI.Controls',
    status: 'moved_to_winui',
    new_api: 'RadialGradientBrush',
    new_pkg: 'Microsoft.UI.Xaml',
  },
  {
    api: 'TabView',
    pkg: 'Microsoft.Toolkit.Uwp.UI.Controls',
    status: 'moved_to_winui',
    new_api: 'TabView',
    new_pkg: 'Microsoft.UI.Xaml',
  },

  // ── Removed with replacement ────────────────────────────────────────────────
  {
    api: 'AdaptiveGridView',
    pkg: 'Microsoft.Toolkit.Uwp.UI.Controls',
    status: 'removed_with_replacement',
    new_api: 'UniformGridLayout',
    new_pkg: 'Microsoft.UI.Xaml',
  },
  {
    api: 'InAppNotification',
    pkg: 'Microsoft.Toolkit.Uwp.UI.Controls',
    status: 'removed_with_replacement',
    new_api: 'StackedNotificationsBehavior',
    new_pkg: 'CommunityToolkit.Uwp.Behaviors',
  },
  {
    api: 'DropShadowPanel',
    pkg: 'Microsoft.Toolkit.Uwp.UI.Controls',
    status: 'removed_with_replacement',
    new_api: 'AttachedDropShadow',
    new_pkg: 'CommunityToolkit.Uwp.Extensions',
  },
  {
    api: 'MarkdownTextBlock',
    pkg: 'Microsoft.Toolkit.Uwp.UI.Controls',
    status: 'removed_with_replacement',
    new_api: 'MarkdownTextBlock',
    new_pkg: null,   // Labs package name unverified for UWP; check github.com/CommunityToolkit/Labs-Windows
  },
  {
    api: 'RadialProgressBar',
    pkg: 'Microsoft.Toolkit.Uwp.UI.Controls',
    status: 'removed_with_replacement',
    new_api: 'ProgressRing',
    new_pkg: 'Microsoft.UI.Xaml',
  },
  // Menu is part of WinUI now (MenuBar) — moved_to_winui in Microsoft.UI.Xaml
  {
    api: 'Menu',
    pkg: 'Microsoft.Toolkit.Uwp.UI.Controls',
    status: 'moved_to_winui',
    new_api: 'MenuBar',
    new_pkg: 'Microsoft.UI.Xaml',
  },
  // MenuItem maps to WinUI MenuBarItem (inside MenuBar)
  {
    api: 'MenuItem',
    pkg: 'Microsoft.Toolkit.Uwp.UI.Controls',
    status: 'moved_to_winui',
    new_api: 'MenuBarItem',
    new_pkg: 'Microsoft.UI.Xaml',
  },

  // ── Removed without replacement ─────────────────────────────────────────────
  {
    api: 'DataGrid',
    pkg: 'Microsoft.Toolkit.Uwp.UI.Controls.DataGrid',
    status: 'removed_no_replacement',
    new_api: null,
    new_pkg: null,
  },
  {
    api: 'DataGridColumn',
    pkg: 'Microsoft.Toolkit.Uwp.UI.Controls.DataGrid',
    status: 'removed_no_replacement',
    new_api: null,
    new_pkg: null,
  },
  {
    api: 'DataGridTextColumn',
    pkg: 'Microsoft.Toolkit.Uwp.UI.Controls.DataGrid',
    status: 'removed_no_replacement',
    new_api: null,
    new_pkg: null,
  },

  // ── GridSplitter: moved to dedicated Sizers sub-package (re-written) ────────
  {
    api: 'GridSplitter',
    pkg: 'Microsoft.Toolkit.Uwp.UI.Controls',
    status: 'direct_rename',
    new_api: 'GridSplitter',
    new_pkg: 'CommunityToolkit.Uwp.Controls.Sizers',
  },

  // ── Headered controls: dedicated sub-package ────────────────────────────────
  {
    api: 'HeaderedContentControl',
    pkg: 'Microsoft.Toolkit.Uwp.UI.Controls',
    status: 'direct_rename',
    new_api: 'HeaderedContentControl',
    new_pkg: 'CommunityToolkit.Uwp.Controls.HeaderedControls',
  },
  {
    api: 'HeaderedItemsControl',
    pkg: 'Microsoft.Toolkit.Uwp.UI.Controls',
    status: 'direct_rename',
    new_api: 'HeaderedItemsControl',
    new_pkg: 'CommunityToolkit.Uwp.Controls.HeaderedControls',
  },
  {
    api: 'HeaderedTreeView',
    pkg: 'Microsoft.Toolkit.Uwp.UI.Controls',
    status: 'direct_rename',
    new_api: 'HeaderedTreeView',
    new_pkg: 'CommunityToolkit.Uwp.Controls.HeaderedControls',
  },

  // ── NOT PORTED to v8: no CommunityToolkit.Uwp package exists ──────────────
  {
    api: 'BladeView',
    pkg: 'Microsoft.Toolkit.Uwp.UI.Controls',
    status: 'removed_no_replacement',
    new_api: null,
    new_pkg: null,
  },
  {
    api: 'WrapPanel',
    pkg: 'Microsoft.Toolkit.Uwp.UI.Controls',
    status: 'removed_no_replacement',
    new_api: null,
    new_pkg: null,
  },
  {
    api: 'TokenizingTextBox',
    pkg: 'Microsoft.Toolkit.Uwp.UI.Controls',
    status: 'direct_rename',
    new_api: 'TokenizingTextBox',
    new_pkg: 'CommunityToolkit.Uwp.Controls.TokenizingTextBox',
  },
  {
    api: 'ImageCropper',
    pkg: 'Microsoft.Toolkit.Uwp.UI.Controls',
    status: 'direct_rename',
    new_api: 'ImageCropper',
    new_pkg: 'CommunityToolkit.Uwp.Controls.ImageCropper',
  },
  {
    api: 'RadialGauge',
    pkg: 'Microsoft.Toolkit.Uwp.UI.Controls',
    status: 'direct_rename',
    new_api: 'RadialGauge',
    new_pkg: 'CommunityToolkit.Uwp.Controls.RadialGauge',
  },
  {
    api: 'StaggeredLayout',
    pkg: 'Microsoft.Toolkit.Uwp.UI.Controls',
    status: 'removed_no_replacement',
    new_api: null,
    new_pkg: null,
  },
  {
    api: 'DockPanel',
    pkg: 'Microsoft.Toolkit.Uwp.UI.Controls',
    status: 'removed_no_replacement',
    new_api: null,
    new_pkg: null,
  },
  {
    api: 'AnimationBuilder',
    pkg: 'Microsoft.Toolkit.Uwp.UI.Animations',
    status: 'direct_rename',
    new_api: 'AnimationBuilder',
    new_pkg: 'CommunityToolkit.Uwp.Animations',
  },
  {
    api: 'ViewportBehavior',
    pkg: 'Microsoft.Toolkit.Uwp.UI.Behaviors',
    status: 'direct_rename',
    new_api: 'ViewportBehavior',
    new_pkg: 'CommunityToolkit.Uwp.Behaviors',
  },
  {
    api: 'BackdropBlurBrush',
    pkg: 'Microsoft.Toolkit.Uwp.UI.Media',
    status: 'direct_rename',
    new_api: 'BackdropBlurBrush',
    new_pkg: 'CommunityToolkit.Uwp.Media',
  },
  {
    api: 'ToastContentBuilder',
    pkg: 'Microsoft.Toolkit.Uwp.Notifications',
    status: 'removed_no_replacement',
    new_api: null,
    new_pkg: null,   // CommunityToolkit.Uwp.Notifications does not exist in v8
  },
];

async function runValidation() {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ['src/index.js'],
    env: { ...process.env },
  });

  const client = new Client({ name: 'seed-validator', version: '1.0.0' });
  await client.connect(transport);

  let passed = 0;
  let failed = 0;
  const failures = [];

  for (const expected of GROUND_TRUTH) {
    const label = `${expected.api} (${expected.pkg.split('.').pop()})`;
    try {
      const result = await client.callTool({
        name: 'find_equivalent',
        arguments: { api_name: expected.api, package_name: expected.pkg },
      });

      const raw = result.content?.[0]?.text || '';

      // Tool returns a markdown table; extract fields from it.
      // Row format:  | **Field Label** | `value` |  or  | **Field Label** | value |
      function tableVal(label) {
        const re = new RegExp(`\\*\\*${label}\\*\\*\\s*\\|\\s*\`?([^\`|\\n]+?)\`?\\s*\\|`, 'i');
        const m = raw.match(re);
        return m ? m[1].trim() : null;
      }

      const data = {
        status:      tableVal('Status'),
        new_api:     tableVal('v8 API'),
        new_package: tableVal('v8 Package'),
      };

      // Normalise N/A → null
      if (data.new_api     === 'N/A') data.new_api     = null;
      if (data.new_package === 'N/A') data.new_package = null;

      if (!data.status) throw new Error(`Could not parse response:\n${raw.slice(0, 400)}`);

      const errors = [];

      if (expected.status !== undefined && data.status !== expected.status) {
        errors.push(`status: got "${data.status}", want "${expected.status}"`);
      }
      if (expected.new_api !== undefined) {
        if (expected.new_api === null && data.new_api != null) {
          errors.push(`new_api: got "${data.new_api}", want null`);
        } else if (expected.new_api !== null && data.new_api !== expected.new_api) {
          errors.push(`new_api: got "${data.new_api}", want "${expected.new_api}"`);
        }
      }
      if (expected.new_pkg !== undefined) {
        if (expected.new_pkg === null && data.new_package != null) {
          errors.push(`new_package: got "${data.new_package}", want null`);
        } else if (expected.new_pkg !== null && data.new_package !== expected.new_pkg) {
          errors.push(`new_package: got "${data.new_package}", want "${expected.new_pkg}"`);
        }
      }

      if (errors.length > 0) {
        throw new Error(errors.join('\n         '));
      }

      console.log(`  ✅  ${label}`);
      passed++;
    } catch (err) {
      console.error(`  ❌  ${label}:\n         ${err.message}`);
      failures.push({ label, error: err.message });
      failed++;
    }
  }

  await client.close();

  console.log(`\n  ${passed} passed, ${failed} failed\n`);

  if (failures.length > 0) {
    console.log('── Failures summary ──────────────────────────────────');
    for (const f of failures) console.log(`  • ${f.label}: ${f.error.split('\n')[0]}`);
    console.log('');
    process.exit(1);
  }
}

runValidation().catch((err) => {
  console.error('Validator error:', err.message);
  process.exit(1);
});
