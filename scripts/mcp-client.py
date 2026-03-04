#!/usr/bin/env python3
"""
Thin MCP HTTP client for wct-migration-mcp-server tool calls.

Usage:
    python mcp-client.py find_equivalent AdaptiveGridView "Microsoft.Toolkit.Uwp.UI.Controls"
    python mcp-client.py search_docs AdaptiveGridView 7.1.1
    python mcp-client.py fetch_article WrapPanel "" 8.x
"""

import sys
import json
import urllib.request
import urllib.error

MCP_URL = "http://localhost:3001/mcp"


def call_tool(tool_name: str, arguments: dict) -> str:
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {"name": tool_name, "arguments": arguments},
    }
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        MCP_URL,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            result = json.loads(resp.read())
            return result.get("result", {}).get("content", [{}])[0].get("text", "")
    except urllib.error.URLError as e:
        return f"Error: {e}"


def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        sys.exit(1)

    tool = args[0]

    if tool == "find_equivalent":
        api_name = args[1] if len(args) > 1 else ""
        package_name = args[2] if len(args) > 2 else ""
        source_version = args[3] if len(args) > 3 else "7.1.1"
        target_version = args[4] if len(args) > 4 else "8.x"
        result = call_tool("find_equivalent", {
            "api_name": api_name,
            "package_name": package_name,
            "source_version": source_version,
            "target_version": target_version,
        })

    elif tool == "search_docs":
        query = args[1] if len(args) > 1 else ""
        version = args[2] if len(args) > 2 else "7.1.1"
        package_name = args[3] if len(args) > 3 else ""
        result = call_tool("search_docs", {
            "query": query,
            "version": version,
            "package_name": package_name,
        })

    elif tool == "fetch_article":
        api_name = args[1] if len(args) > 1 else ""
        package_name = args[2] if len(args) > 2 else ""
        version = args[3] if len(args) > 3 else "8.x"
        result = call_tool("fetch_article", {
            "api_name": api_name,
            "package_name": package_name,
            "version": version,
        })

    else:
        print(f"Unknown tool: {tool}")
        print("Available tools: find_equivalent, search_docs, fetch_article")
        sys.exit(1)

    print(result)


if __name__ == "__main__":
    main()
