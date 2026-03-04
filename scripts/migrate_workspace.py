#!/usr/bin/env python3
"""
migrate_workspace.py — WCT v7.1.1 → v8.x migration script (Python version).

Implements the same algorithm as Migrate-WctWorkspace.ps1 but callable from
Python tooling and the Copilot agent skill.

Usage:
    python scripts/migrate_workspace.py --solution MySolution.sln
    python scripts/migrate_workspace.py --solution MySolution.sln --mcp-url http://localhost:3001
"""

import argparse
import json
import os
import re
import subprocess
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

try:
    import requests
except ImportError:
    print("❌  requests not installed. Run: pip install requests", file=sys.stderr)
    sys.exit(1)

# ── Defaults ──────────────────────────────────────────────────────────────────

DEFAULT_MCP_URL   = "http://localhost:3001"
LATEST_V8_VERSION = "8.1.240916"
MAX_ITERATIONS    = 20
SAME_ERROR_BAIL   = 3

NAMESPACE_MAPPINGS = [
    ("Microsoft.Toolkit.Uwp.UI.Controls",    "CommunityToolkit.WinUI.Controls"),
    ("Microsoft.Toolkit.Uwp.UI.Animations",  "CommunityToolkit.WinUI.Animations"),
    ("Microsoft.Toolkit.Uwp.UI.Behaviors",   "CommunityToolkit.WinUI.Behaviors"),
    ("Microsoft.Toolkit.Uwp.UI.Media",       "CommunityToolkit.WinUI.Media"),
    ("Microsoft.Toolkit.Uwp.Helpers",        "CommunityToolkit.WinUI.Helpers"),
    ("Microsoft.Toolkit.Uwp.UI.Extensions",  "CommunityToolkit.WinUI.Extensions"),
    ("Microsoft.Toolkit.Uwp.Notifications",  "CommunityToolkit.WinUI.Notifications"),
]

# ── MCP client ────────────────────────────────────────────────────────────────

class McpClient:
    def __init__(self, base_url: str):
        self.url = base_url.rstrip("/") + "/mcp"
        self.headers = {
            "Content-Type": "application/json",
            "Accept": "application/json, text/event-stream",
        }

    def call_tool(self, tool: str, arguments: dict) -> str | None:
        body = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/call",
            "params": {"name": tool, "arguments": arguments},
        }
        try:
            resp = requests.post(self.url, json=body, headers=self.headers, timeout=30)
            resp.raise_for_status()
            # Response may be SSE; extract the data: line
            text = resp.text
            for line in text.splitlines():
                if line.startswith("data:"):
                    payload = json.loads(line[5:].strip())
                    return payload.get("result", {}).get("content", [{}])[0].get("text")
            # Fallback: plain JSON
            data = resp.json()
            return data.get("result", {}).get("content", [{}])[0].get("text")
        except Exception as e:
            print(f"  ⚠️  MCP call failed ({tool}): {e}", file=sys.stderr)
            return None

    def find_equivalent(self, api_name: str, package_name: str = "") -> dict | None:
        text = self.call_tool("find_equivalent", {"api_name": api_name, "package_name": package_name})
        if not text:
            return None
        # Extract JSON block from markdown response
        m = re.search(r"```json\s*([\s\S]*?)```", text) or re.search(r"(\{[\s\S]*?\})", text)
        if m:
            try:
                return json.loads(m.group(1))
            except json.JSONDecodeError:
                pass
        return {"raw": text}

    def fetch_article(self, api_name: str, version: str = "8.x") -> str | None:
        return self.call_tool("fetch_article", {"api_name": api_name, "version": version})

# ── Helpers ───────────────────────────────────────────────────────────────────

def is_wct_v7_package(pkg_id: str) -> bool:
    return pkg_id.startswith("Microsoft.Toolkit.") or pkg_id.startswith("CommunityToolkit.WinUI.UI.")

def find_csproj_files(solution_dir: Path) -> list[Path]:
    return list(solution_dir.rglob("*.csproj"))

def parse_package_refs(csproj_path: Path) -> list[dict]:
    ET.register_namespace("", "http://schemas.microsoft.com/developer/msbuild/2003")
    try:
        tree = ET.parse(csproj_path)
        root = tree.getroot()
        # Strip namespace for XPath
        refs = []
        for elem in root.iter():
            tag = elem.tag.split("}")[-1] if "}" in elem.tag else elem.tag
            if tag == "PackageReference":
                pkg_id = elem.get("Include", "")
                if is_wct_v7_package(pkg_id):
                    refs.append({"id": pkg_id, "version": elem.get("Version", "")})
        return refs
    except ET.ParseError as e:
        print(f"  ⚠️  Could not parse {csproj_path}: {e}", file=sys.stderr)
        return []

def replace_package_in_csproj(csproj_path: Path, old_id: str, new_id: str, new_version: str):
    content = csproj_path.read_text(encoding="utf-8")
    pattern = re.compile(
        rf'(<PackageReference\s+Include="){re.escape(old_id)}(")',
        re.IGNORECASE,
    )
    replacement = rf'\g<1>{new_id}\g<2>'
    new_content = pattern.sub(replacement, content)
    # Update version on same element (simple approach)
    version_pattern = re.compile(
        rf'(Include="{re.escape(new_id)}"\s+Version=")[^"]*(")',
        re.IGNORECASE,
    )
    new_content = version_pattern.sub(rf'\g<1>{new_version}\g<2>', new_content)
    if new_content != content:
        csproj_path.write_text(new_content, encoding="utf-8")
        return True
    return False

def update_namespaces_in_file(file_path: Path) -> bool:
    try:
        content = file_path.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        return False
    changed = False
    for old_ns, new_ns in NAMESPACE_MAPPINGS:
        if old_ns in content:
            content = content.replace(old_ns, new_ns)
            changed = True
    if changed:
        file_path.write_text(content, encoding="utf-8")
    return changed

def run_build(solution_path: Path, config: str, platform: str) -> tuple[int, str]:
    result = subprocess.run(
        ["dotnet", "build", str(solution_path), "-c", config, f"/p:Platform={platform}"],
        capture_output=True,
        text=True,
    )
    return result.returncode, result.stdout + result.stderr

def parse_build_errors(output: str) -> list[dict]:
    errors = []
    pattern = re.compile(r"(?P<file>[^(]+)\((?P<line>\d+),\d+\).*error (?P<code>[A-Z]+\d+): (?P<msg>.+)")
    for line in output.splitlines():
        m = pattern.search(line)
        if m:
            errors.append({
                "file": m.group("file").strip(),
                "line": int(m.group("line")),
                "code": m.group("code"),
                "msg":  m.group("msg").strip(),
                "raw":  line.strip(),
            })
    return errors

def extract_type_from_error(error: dict) -> str | None:
    m = re.search(r"type or namespace name '([^']+)'", error["msg"], re.IGNORECASE)
    if m:
        return m.group(1)
    m = re.search(r"'([^']+)' does not exist", error["msg"])
    if m:
        return m.group(1)
    return None

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Migrate WCT v7.1.1 → v8.x")
    parser.add_argument("--solution", required=True, help="Path to .sln file")
    parser.add_argument("--mcp-url", default=DEFAULT_MCP_URL, help="MCP server URL")
    parser.add_argument("--config",   default="Debug",  help="MSBuild configuration")
    parser.add_argument("--platform", default="x64",    help="MSBuild platform")
    parser.add_argument("--max-iterations", type=int, default=MAX_ITERATIONS)
    args = parser.parse_args()

    solution_path = Path(args.solution).resolve()
    solution_dir  = solution_path.parent
    mcp = McpClient(args.mcp_url)

    print(f"\n🚀  WCT Migration: {solution_path}\n")

    # ── Step 1: Scan .csproj files ────────────────────────────────────────────

    csproj_files = find_csproj_files(solution_dir)
    print(f"  ▶ Found {len(csproj_files)} .csproj file(s)")

    old_packages = []
    for csproj in csproj_files:
        for ref in parse_package_refs(csproj):
            old_packages.append({"csproj": csproj, **ref})

    print(f"  ▶ Found {len(old_packages)} WCT v7 package reference(s)")

    # ── Step 2 & 3: Resolve and apply package changes ─────────────────────────

    migration_report = []
    for pkg in old_packages:
        print(f"  ▶ Resolving: {pkg['id']}")
        result = mcp.find_equivalent(pkg["id"], pkg["id"])
        if not result:
            print(f"  ⚠️  Could not resolve {pkg['id']}")
            continue

        status  = result.get("status", "unknown")
        new_pkg = result.get("new_package")

        migration_report.append({"old": pkg["id"], "new": new_pkg, "status": status})

        if status == "removed_no_replacement":
            print(f"  ⚠️  {pkg['id']} → removed, no replacement")
        elif new_pkg and status != "moved_to_winui":
            if replace_package_in_csproj(pkg["csproj"], pkg["id"], new_pkg, LATEST_V8_VERSION):
                print(f"  ✅  {pkg['id']} → {new_pkg}")
        elif status == "moved_to_winui":
            print(f"  ✅  {pkg['id']} → built-in WinUI (remove PackageReference)")

    # ── Step 4: Update namespaces ─────────────────────────────────────────────

    source_files = list(solution_dir.rglob("*.cs")) + list(solution_dir.rglob("*.xaml"))
    print(f"\n  ▶ Updating namespaces in {len(source_files)} source file(s)")
    updated_files = [f for f in source_files if update_namespaces_in_file(f)]
    print(f"  ✅  Updated {len(updated_files)} file(s)")

    # ── Step 5 & 6: Build-fix loop ────────────────────────────────────────────

    print(f"\n🔨  Build-Fix Loop (max {args.max_iterations} iterations)\n")

    last_error_keys: set[str] = set()
    same_error_count = 0

    for iteration in range(1, args.max_iterations + 1):
        print(f"  ▶ Build attempt #{iteration}...")
        exit_code, output = run_build(solution_path, args.config, args.platform)

        if exit_code == 0:
            print(f"  ✅  Build succeeded on attempt #{iteration}! 🎉")
            break

        errors = parse_build_errors(output)
        error_keys = {f"{e['code']}:{e['msg'][:60]}" for e in errors}

        if error_keys == last_error_keys:
            same_error_count += 1
            if same_error_count >= SAME_ERROR_BAIL:
                print("  ❌  Stuck on same errors. Manual intervention needed:")
                for e in errors:
                    print(f"       {e['raw']}")
                break
        else:
            same_error_count = 0
        last_error_keys = error_keys

        for error in errors:
            code = error["code"]
            if code in ("CS0246", "CS0234"):
                type_name = extract_type_from_error(error)
                if type_name:
                    print(f"  ▶ Resolving missing type: {type_name}")
                    result = mcp.find_equivalent(type_name)
                    if result and result.get("new_api"):
                        print(f"     → {result['new_api']} in {result.get('new_package', '?')}")
            elif code.startswith("NU"):
                print("  ▶ NuGet error — running dotnet restore")
                subprocess.run(["dotnet", "restore", str(solution_path)], capture_output=True)
            elif code in ("XLS0414",) or code.startswith("XFC"):
                type_name = extract_type_from_error(error)
                if type_name:
                    print(f"  ▶ Resolving missing XAML type: {type_name}")
                    result = mcp.find_equivalent(type_name)
                    if result and result.get("new_api"):
                        print(f"     → {result['new_api']} in {result.get('new_package', '?')}")
    else:
        print(f"  ❌  Build did not succeed after {args.max_iterations} iterations.")

    # ── Report ────────────────────────────────────────────────────────────────

    print("\n📋  Migration Report")
    print(f"  Packages resolved:     {len(migration_report)}")
    print(f"  Source files updated:  {len(updated_files)}")
    removed = [r for r in migration_report if r["status"] == "removed_no_replacement"]
    if removed:
        print(f"  ⚠️  Packages with no v8 replacement ({len(removed)}):")
        for r in removed:
            print(f"       • {r['old']}")
    print()


if __name__ == "__main__":
    main()
