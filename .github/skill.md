# windows_toolkit_migration Skill

Migrate a .NET/WinUI solution from Windows Community Toolkit **v7.1.1 to v8.x** by orchestrating live MCP tool calls against the `wct-migration` server.

---

## Trigger

Invoke this skill whenever the developer says anything like:

- "Migrate my project from WCT 7 to 8"
- "Help me upgrade Windows Community Toolkit"
- "What changed between WCT v7 and v8?"

---

## Prerequisites

- The `wct-migration` MCP server is running and connected (see `agent.md`).
- The developer has provided a path to the `.sln` file or workspace root.

---

## Step 1 — Discover WCT v7 Package References

Scan every `.csproj` in the solution directory for `PackageReference` entries whose `Include` attribute starts with:

- `Microsoft.Toolkit.*`
- `CommunityToolkit.WinUI.UI.*`

For each match, record `{ file, packageId, currentVersion }`.

---

## Step 2 — Resolve v8 Equivalents via MCP

For **each** package found in Step 1, call:

```
find_equivalent(
  api_name    = "<packageId>",
  package_name = "<packageId>"
)
```

Parse the response and record:

| Response field | Meaning |
|----------------|---------|
| `status: "migrated"` | Replace with `new_package` at `8.1.240916` |
| `status: "removed_no_replacement"` | Comment out the reference; warn the developer |
| `status: "moved_to_winui"` | Remove the NuGet reference; the API is built into WinUI |
| `status: "removed_with_replacement"` | Apply the `usage_example` from the response |

---

## Step 3 — Apply Package Reference Changes

Edit each `.csproj` file:

- **Replace** `<PackageReference Include="<old>" Version="…" />` with `<PackageReference Include="<new>" Version="8.1.240916" />`.
- **Comment out** packages with `removed_no_replacement` and add `<!-- WCT-Migration: no v8 equivalent -->`.
- **Delete** packages with `moved_to_winui` and add an inline XML comment explaining the built-in.

---

## Step 4 — Update Namespaces in .cs and .xaml Files

Apply these exact find-and-replace pairs (case-sensitive) to every `.cs` and `.xaml` file:

| Old namespace | New namespace |
|---------------|---------------|
| `Microsoft.Toolkit.Uwp.UI.Controls` | `CommunityToolkit.WinUI.Controls` |
| `Microsoft.Toolkit.Uwp.UI.Animations` | `CommunityToolkit.WinUI.Animations` |
| `Microsoft.Toolkit.Uwp.UI.Behaviors` | `CommunityToolkit.WinUI.Behaviors` |
| `Microsoft.Toolkit.Uwp.UI.Media` | `CommunityToolkit.WinUI.Media` |
| `Microsoft.Toolkit.Uwp.Helpers` | `CommunityToolkit.WinUI.Helpers` |
| `Microsoft.Toolkit.Uwp.UI.Extensions` | `CommunityToolkit.WinUI.Extensions` |
| `Microsoft.Toolkit.Uwp.Notifications` | `CommunityToolkit.WinUI.Notifications` |

---

## Step 5 — Resolve API-Level Changes via MCP

Scan all `.cs` and `.xaml` files for usages of known WCT control type names (e.g., `AdaptiveGridView`, `DropShadowPanel`, `InAppNotification`).

For each type found, call:

```
find_equivalent(
  api_name     = "<TypeName>",
  package_name = "<inferred package>"
)
```

Then:

- `removed_with_replacement` → apply the `usage_example` from the response; add a `// WCT-Migration:` comment.
- `moved_to_winui` → update the namespace to `Microsoft.UI.Xaml.*`.
- `api_changed` → apply the changes from the `breaking_changes` field.

If the response is unclear, call:

```
fetch_article(
  api_name = "<TypeName>",
  version  = "8.x"
)
```

to get full documentation before making changes.

---

## Step 6 — Build-Fix Loop (max 20 iterations)

Run:

```
dotnet build <solution.sln> -c Debug /p:Platform=x64
```

For each compiler error, apply the action in the table below, then rebuild.

| Error code | MCP call | Action |
|------------|----------|--------|
| `CS0246`, `CS0234` | `find_equivalent(missing_type)` | Add/update package reference or using directive |
| `CS0117` | `fetch_article(type_name, version="8.x")` | Update member usage |
| `NU*` | — | Run `dotnet restore`; update package version if needed |
| `XLS0414`, `XFC*` | `find_equivalent(xaml_type)` | Update `xmlns` declaration or control reference |

If the **same set of errors** repeats for **3 consecutive iterations**, stop the loop and record them as requiring manual intervention in the report.

---

## Step 7 — Generate Migration Report

Write `migration-report.md` to the solution root using the template defined in `agent.md`.

Populate every section:

1. **Summary** — counts of packages resolved, files updated, build attempts, final build result.
2. **Package Migrations** — one row per package (old → new, status).
3. **Source Files Updated** — list every file that was modified and what changed.
4. **Unresolved Issues** — any errors that could not be auto-resolved, with file/line references.
5. **MCP Tool Call Log** — complete chronological log of every `find_equivalent`, `search_docs`, and `fetch_article` call made during this session, with inputs and summarised outputs.

Present the report path to the developer and offer to open it.

---

## Important Notes

| Control / API | Migration guidance |
|---------------|-------------------|
| `RadialProgressBar` | Deprecated → use WinUI `ProgressRing` with `IsIndeterminate="True"` |
| `Menu` / `MenuItem` | Moved to WinUI `MenuBar` / `MenuBarItem`; not in CommunityToolkit v8 |
| `GridSplitter` | Now in `CommunityToolkit.WinUI.Controls.Sizers`; API rewritten — call `fetch_article` |
| `HeaderedContentControl` / `HeaderedItemsControl` / `HeaderedTreeView` | In `CommunityToolkit.WinUI.Controls.HeaderedControls`; `Orientation` removed |
| `DataGrid` | Not ported; keep the standalone `Microsoft.Toolkit.Uwp.UI.Controls.DataGrid` 7.x package |
| `AdaptiveGridView` | Removed → use `ItemsRepeater` + `UniformGridLayout` (WinUI built-in) |
| `DropShadowPanel` | Removed → use `AttachedCardShadow` from `CommunityToolkit.WinUI.Media` |
| `InAppNotification` | Removed → use `InfoBar` + `StackedNotificationsBehavior` from `CommunityToolkit.WinUI.Behaviors` |
| `BladeView` | Removed with no v8 equivalent; consider a custom `NavigationView` layout |
