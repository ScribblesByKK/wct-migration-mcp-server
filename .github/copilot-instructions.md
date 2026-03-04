# windows_toolkit_migration Skill

When asked to migrate a project from Windows Community Toolkit (WCT) v7.1.1 to v8.x,
use the `wct-migration` MCP server tools to drive the migration.

## MCP Server

- **Local:** `http://localhost:3001/mcp`
- **Remote:** configured via `.vscode/mcp.json` or workspace MCP config
- **Tools:** `find_equivalent`, `search_docs`, `fetch_article`

## Migration Workflow

### Step 1 — Scan for WCT v7 package references
Find all `.csproj` files. For each, locate `PackageReference` entries where `Include` starts
with `Microsoft.Toolkit.*` or `CommunityToolkit.WinUI.UI.*`.

### Step 2 — Resolve v8 equivalents
For each old package, call:
```
find_equivalent(api_name=<PackageId>, package_name=<PackageId>)
```
Record `status`, `new_api`, `new_package` from the response.

### Step 3 — Apply package reference changes
- `removed_no_replacement` → comment out the PackageReference, log a warning
- `moved_to_winui` → replace with the WinUI built-in (no NuGet package needed)
- all others → replace with `new_package` at latest 8.x version (e.g. `8.1.240916`)

### Step 4 — Update namespaces in all .cs and .xaml files
Run find-and-replace for these namespace pairs (case-sensitive):

| Old | New |
|-----|-----|
| `Microsoft.Toolkit.Uwp.UI.Controls` | `CommunityToolkit.WinUI.Controls` |
| `Microsoft.Toolkit.Uwp.UI.Animations` | `CommunityToolkit.WinUI.Animations` |
| `Microsoft.Toolkit.Uwp.UI.Behaviors` | `CommunityToolkit.WinUI.Behaviors` |
| `Microsoft.Toolkit.Uwp.UI.Media` | `CommunityToolkit.WinUI.Media` |
| `Microsoft.Toolkit.Uwp.Helpers` | `CommunityToolkit.WinUI.Helpers` |
| `Microsoft.Toolkit.Uwp.UI.Extensions` | `CommunityToolkit.WinUI.Extensions` |
| `Microsoft.Toolkit.Uwp.Notifications` | `CommunityToolkit.WinUI.Notifications` |

### Step 5 — Handle API-level changes
Scan all .cs and .xaml files for WCT control type names. For each match call:
```
find_equivalent(api_name=<TypeName>, package_name=<InferredPackage>)
```
- `removed_with_replacement` → apply `usage_example` from response, add inline comment
- `moved_to_winui` → update namespace to `Microsoft.UI.Xaml.*`
- `api_changed` → apply changes from `breaking_changes` field

### Step 6 — Build-fix loop (max 20 iterations)
```
dotnet build <solution.sln> -c Debug /p:Platform=x64
```
Parse MSBuild errors and resolve:

| Error code | Action |
|-----------|--------|
| `CS0246`, `CS0234` | Missing type/namespace → `find_equivalent(missing_type)` → add/update ref |
| `CS0117` | Missing member → `fetch_article(type_name, version=8.x)` → update usage |
| `NU*` | NuGet error → `dotnet restore`, update package version |
| `XLS0414`, `XFC*` | XAML type not found → `find_equivalent(xaml_type)` → update xmlns/control refs |

If the same errors persist for 3 consecutive iterations, stop and report them as
requiring manual intervention.

### Step 7 — Report
Output a summary:
- Packages migrated (old → new)
- Source files updated
- Unresolved errors requiring manual attention

## Important Notes

- **RadialProgressBar** → deprecated; use WinUI `ProgressRing` with `IsIndeterminate="True"`
- **Menu / MenuItem** → moved to WinUI `MenuBar` / `MenuBarItem`; not in CommunityToolkit v8
- **GridSplitter** → now in `CommunityToolkit.WinUI.Controls.Sizers`, API re-written
- **HeaderedContentControl / HeaderedItemsControl / HeaderedTreeView** → in `CommunityToolkit.WinUI.Controls.HeaderedControls`; `HeaderedItemsControl.Orientation` removed
- **DataGrid** → not ported; continue using standalone 7.x DataGrid package
- **AdaptiveGridView** → use `ItemsRepeater` + `UniformGridLayout` (WinUI built-in)
- **DropShadowPanel** → use `AttachedCardShadow` from `CommunityToolkit.WinUI.Media`
- **InAppNotification** → use `InfoBar` + `StackedNotificationsBehavior` from `CommunityToolkit.WinUI.Behaviors`

## Quick Reference: Run the migration script

```powershell
# PowerShell
.\scripts\Migrate-WctWorkspace.ps1 -SolutionPath .\MySolution.sln

# Python
python scripts/migrate_workspace.py --solution MySolution.sln
```
