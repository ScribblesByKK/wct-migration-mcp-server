#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Automates migration of a WinUI solution from Windows Community Toolkit v7.1.1 to v8.x.

.DESCRIPTION
    Scans all .csproj files, calls the wct-migration MCP server to find v8 equivalents,
    updates package references and namespaces, then runs a build-fix loop.

.PARAMETER SolutionPath
    Path to the .sln file to migrate.

.PARAMETER McpUrl
    URL of the wct-migration MCP server. Default: http://localhost:3001/mcp

.PARAMETER Configuration
    MSBuild configuration. Default: Debug

.PARAMETER Platform
    MSBuild platform. Default: x64

.PARAMETER MaxIterations
    Maximum build-fix loop iterations. Default: 20

.EXAMPLE
    .\Migrate-WctWorkspace.ps1 -SolutionPath .\MySolution.sln
#>

param(
    [Parameter(Mandatory)]
    [string]$SolutionPath,

    [string]$McpUrl = "http://localhost:3001",

    [string]$Configuration = "Debug",

    [string]$Platform = "x64",

    [int]$MaxIterations = 20
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ── Helpers ───────────────────────────────────────────────────────────────────

function Write-Step($msg) { Write-Host "  ▶ $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "  ✅ $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "  ⚠️  $msg" -ForegroundColor Yellow }
function Write-Fail($msg) { Write-Host "  ❌ $msg" -ForegroundColor Red }

function Invoke-McpTool($tool, $args) {
    $body = @{ method = "tools/call"; params = @{ name = $tool; arguments = $args } } | ConvertTo-Json -Depth 5
    try {
        $resp = Invoke-RestMethod -Uri "$McpUrl/mcp" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 30
        return $resp.result.content[0].text
    } catch {
        Write-Warn "MCP call failed for ${tool}: $_"
        return $null
    }
}

function Find-Equivalent($apiName, $packageName) {
    return Invoke-McpTool "find_equivalent" @{ api_name = $apiName; package_name = $packageName }
}

function Parse-Status($mcpText) {
    if ($mcpText -match '\`([a-z_]+)\`' ) { return $Matches[1] }
    return "unknown"
}

function Parse-NewPackage($mcpText) {
    if ($mcpText -match '\*\*v8 Package\*\* \| \`([^`]+)\`') { return $Matches[1] }
    return $null
}

# ── Step 1: Find all .csproj files ────────────────────────────────────────────

$solutionDir = Split-Path -Parent (Resolve-Path $SolutionPath)
Write-Host "`n🚀 WCT Migration: $SolutionPath`n" -ForegroundColor Magenta

$csprojFiles = Get-ChildItem -Path $solutionDir -Filter "*.csproj" -Recurse
Write-Step "Found $($csprojFiles.Count) .csproj file(s)"

# ── Step 2: Collect all WCT package references ────────────────────────────────

$oldPackages = @()
foreach ($csproj in $csprojFiles) {
    [xml]$xml = Get-Content $csproj.FullName
    $refs = $xml.SelectNodes("//PackageReference") | Where-Object {
        $_.Include -like "Microsoft.Toolkit.*" -or $_.Include -like "CommunityToolkit.WinUI.UI.*"
    }
    foreach ($ref in $refs) {
        $oldPackages += @{ CsprojPath = $csproj.FullName; PackageId = $ref.Include; Version = $ref.Version }
    }
}

Write-Step "Found $($oldPackages.Count) WCT v7 package reference(s)"

# ── Step 3: Resolve v8 equivalents and update .csproj ─────────────────────────

$migrationPlan = @()

foreach ($pkg in $oldPackages) {
    Write-Step "Resolving: $($pkg.PackageId)"

    $mcpText = Find-Equivalent $pkg.PackageId $pkg.PackageId
    if (-not $mcpText) { Write-Warn "Could not resolve $($pkg.PackageId)"; continue }

    $status = Parse-Status $mcpText
    $newPkg  = Parse-NewPackage $mcpText

    $migrationPlan += @{
        CsprojPath = $pkg.CsprojPath
        OldPackage = $pkg.PackageId
        NewPackage = $newPkg
        Status     = $status
    }

    if ($status -eq "removed_no_replacement") {
        Write-Warn "$($pkg.PackageId) → removed with no replacement"
    } elseif ($newPkg -and $newPkg -ne "N/A") {
        Write-Ok "$($pkg.PackageId) → $newPkg"

        # Update the .csproj
        $content = Get-Content $pkg.CsprojPath -Raw
        $newVersion = "8.1.240916"  # Latest stable 8.x version
        $content = $content -replace [regex]::Escape("<PackageReference Include=`"$($pkg.PackageId)`""),
            "<PackageReference Include=`"$newPkg`" Version=`"$newVersion`" <!-- WCT Migration --"
        Set-Content $pkg.CsprojPath $content -NoNewline
    }
}

# ── Step 4: Update using statements and XAML xmlns ───────────────────────────

$namespaceMappings = @(
    @{ Old = "Microsoft.Toolkit.Uwp.UI.Controls"; New = "CommunityToolkit.WinUI.Controls" },
    @{ Old = "Microsoft.Toolkit.Uwp.UI.Animations"; New = "CommunityToolkit.WinUI.Animations" },
    @{ Old = "Microsoft.Toolkit.Uwp.UI.Behaviors"; New = "CommunityToolkit.WinUI.Behaviors" },
    @{ Old = "Microsoft.Toolkit.Uwp.UI.Media"; New = "CommunityToolkit.WinUI.Media" },
    @{ Old = "Microsoft.Toolkit.Uwp.Helpers"; New = "CommunityToolkit.WinUI.Helpers" },
    @{ Old = "Microsoft.Toolkit.Uwp.UI.Extensions"; New = "CommunityToolkit.WinUI.Extensions" },
    @{ Old = "Microsoft.Toolkit.Uwp.Notifications"; New = "CommunityToolkit.WinUI.Notifications" }
)

$sourceFiles = Get-ChildItem -Path $solutionDir -Include "*.cs","*.xaml" -Recurse
Write-Step "Updating namespaces in $($sourceFiles.Count) source file(s)"

foreach ($file in $sourceFiles) {
    $content = Get-Content $file.FullName -Raw
    $changed = $false
    foreach ($ns in $namespaceMappings) {
        if ($content -match [regex]::Escape($ns.Old)) {
            $content = $content -replace [regex]::Escape($ns.Old), $ns.New
            $changed = $true
        }
    }
    if ($changed) {
        Set-Content $file.FullName $content -NoNewline
        Write-Ok "Updated: $($file.Name)"
    }
}

# ── Step 5: Build-Fix Loop ────────────────────────────────────────────────────

Write-Host "`n🔨 Build-Fix Loop (max $MaxIterations iterations)`n" -ForegroundColor Magenta

$iteration = 0
$lastErrors = @()
$sameErrorCount = 0

while ($iteration -lt $MaxIterations) {
    $iteration++
    Write-Step "Build attempt #$iteration..."

    $buildOutput = & dotnet build $SolutionPath -c $Configuration /p:Platform=$Platform 2>&1
    $exitCode = $LASTEXITCODE

    if ($exitCode -eq 0) {
        Write-Ok "Build succeeded on attempt #$iteration! 🎉"
        break
    }

    # Parse build errors
    $errors = $buildOutput | Where-Object { $_ -match "error (CS|NU|XLS|XFC)\d+" } |
        ForEach-Object {
            if ($_ -match "(CS\d+|NU\d+|XLS\d+|XFC\d+).*'([^']+)'") {
                @{ Code = $Matches[1]; Name = $Matches[2]; Line = $_ }
            }
        } | Where-Object { $_ }

    $errorKeys = $errors | ForEach-Object { "$($_.Code):$($_.Name)" }

    if ($null -eq (Compare-Object $lastErrors $errorKeys)) {
        $sameErrorCount++
        if ($sameErrorCount -ge 3) {
            Write-Fail "Stuck on same errors after 3 attempts. Manual intervention needed."
            Write-Host ($errors | ForEach-Object { "  $($_.Line)" } | Out-String)
            break
        }
    } else {
        $sameErrorCount = 0
    }
    $lastErrors = $errorKeys

    foreach ($err in $errors) {
        if ($err.Code -match "^CS(0246|0234)$") {
            # Missing type/namespace — call find_equivalent
            Write-Step "Resolving missing type: $($err.Name)"
            $mcpText = Find-Equivalent $err.Name ""
            if ($mcpText) {
                $newPkg = Parse-NewPackage $mcpText
                Write-Ok "Resolved $($err.Name) → $newPkg"
            }
        } elseif ($err.Code -match "^NU") {
            Write-Step "NuGet error — running dotnet restore"
            & dotnet restore $SolutionPath | Out-Null
        }
    }
}

if ($iteration -ge $MaxIterations) {
    Write-Fail "Build did not succeed after $MaxIterations iterations."
}

Write-Host "`n📋 Migration Report" -ForegroundColor Magenta
Write-Host "  Packages migrated: $($migrationPlan.Count)"
Write-Host "  Source files updated: $(($sourceFiles | Where-Object { $_ }).Count)"
Write-Host ""
