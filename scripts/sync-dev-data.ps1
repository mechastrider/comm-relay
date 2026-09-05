# Copy desktop user data into var/data for local web:dev.
param(
    [string]$Source = (Join-Path $env:APPDATA "comm-relay")
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path $PSScriptRoot -Parent
$dest = Join-Path $repoRoot "var\data"

if (-not (Test-Path $Source)) {
    Write-Error "Desktop data directory not found: $Source"
}

New-Item -ItemType Directory -Force -Path $dest | Out-Null

$files = @("config.json", "comm-relay.db", "comm-relay.db-wal", "comm-relay.db-shm")
foreach ($name in $files) {
    $from = Join-Path $Source $name
    if (Test-Path $from) {
        Copy-Item -Path $from -Destination (Join-Path $dest $name) -Force
        Write-Host "copied $name"
    }
}

$assetsFrom = Join-Path $Source "overlay-assets"
$assetsTo = Join-Path $dest "overlay-assets"
if (Test-Path $assetsFrom) {
    New-Item -ItemType Directory -Force -Path $assetsTo | Out-Null
    Copy-Item -Path (Join-Path $assetsFrom "*") -Destination $assetsTo -Force -Recurse
    $count = @(Get-ChildItem $assetsTo -File).Count
    Write-Host "copied overlay-assets ($count files)"
}

Write-Host "Dev data ready at $dest"
