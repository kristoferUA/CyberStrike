[CmdletBinding()]
param(
    [switch]$SkipInstall,
    [switch]$SkipBrowserInstall,
    [string]$ModelsPath,
    [string]$Version
)

$ErrorActionPreference = 'Stop'
$root = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$bun = (Get-Command bun -ErrorAction Stop).Source
$package = Get-Content -LiteralPath (Join-Path $root 'packages/cyberstrike/package.json') -Raw | ConvertFrom-Json
if (-not $Version) { $Version = "$($package.version)-ctf.2" }
if ($ModelsPath) { $ModelsPath = (Resolve-Path -LiteralPath $ModelsPath).Path }

$names = @('CYBERSTRIKE_VERSION', 'CYBERSTRIKE_CHANNEL', 'CYBERSTRIKE_BUMP', 'CYBERSTRIKE_RELEASE', 'CYBERSTRIKE_BUILD_OS', 'CYBERSTRIKE_DIST_DIR', 'MODELS_DEV_API_JSON')
$saved = @{}
foreach ($name in $names) { $saved[$name] = [Environment]::GetEnvironmentVariable($name, 'Process') }

Push-Location -LiteralPath $root
try {
    $env:CYBERSTRIKE_VERSION = $Version
    $env:CYBERSTRIKE_CHANNEL = 'ctf'
    $env:CYBERSTRIKE_BUMP = $null
    $env:CYBERSTRIKE_RELEASE = $null
    $env:CYBERSTRIKE_BUILD_OS = 'windows'
    $env:CYBERSTRIKE_DIST_DIR = 'dist-windows'
    if ($ModelsPath) { $env:MODELS_DEV_API_JSON = $ModelsPath }

    if (-not $SkipInstall) {
        & $bun install --frozen-lockfile
        if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed.' }
    }
    Set-Location -LiteralPath (Join-Path $root 'packages/cyberstrike')
    & $bun run script/build.ts --single --skip-install
    if ($LASTEXITCODE -ne 0) { throw 'Windows build failed. Close CyberStrike before rebuilding its executable.' }
    if (-not $SkipBrowserInstall) {
        & $bun (Join-Path $root 'node_modules/playwright/cli.js') install chromium
        if ($LASTEXITCODE -ne 0) { throw 'Chromium installation failed. Run this build again after resolving the download error.' }
    }
    Write-Host "Built CyberStrike CTF $Version. Start it with $root\bin\cyberstrike.cmd"
} finally {
    Pop-Location
    foreach ($name in $names) { [Environment]::SetEnvironmentVariable($name, $saved[$name], 'Process') }
}
