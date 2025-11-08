<#
.SYNOPSIS
Creates the project folder structure for this repository on Windows PowerShell.

USAGE
Open PowerShell in the project root and run:
    powershell -ExecutionPolicy Bypass -File .\create_folder_structure.ps1

This script is idempotent — it will create folders if missing and not error if they already exist.
#>

param(
    [string]$Root = (Get-Location).Path
)

Write-Host "Creating folder structure under: $Root" -ForegroundColor Cyan

$dirs = @(
    "app",
    "app/(auth)",
    "app/api",
    "app/api/assignment",
    "app/api/assignment/generate",
    "app/api/assignment/evaluate",
    "app/api/assessment",
    "app/api/tutor",
    "app/dashboard",
    "app/setup",
    "components",
    "hooks",
    "lib",
    "lib/agents",
    "lib/supabase",
    "lib/types",
    "public",
    "scripts",
    "scripts/archive",
    "styles",
    "types",
    "docs",
    "docs/archive",
    "pages",
    "tests",
    "private",
    "bin"
)

foreach ($d in $dirs) {
    $path = Join-Path -Path $Root -ChildPath $d
    if (-Not (Test-Path $path)) {
        New-Item -ItemType Directory -Path $path -Force | Out-Null
        Write-Host "Created: $d" -ForegroundColor Green
    } else {
        Write-Host "Exists:  $d" -ForegroundColor DarkYellow
    }
}

# create a couple of helpful placeholder files
$placeholders = @(
    "docs/README.md",
    "scripts/README.md",
    "components/README.md",
    "lib/README.md",
    "app/api/README.md"
)

foreach ($f in $placeholders) {
    $filePath = Join-Path -Path $Root -ChildPath $f
    $dir = Split-Path $filePath -Parent
    if (-Not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    if (-Not (Test-Path $filePath)) {
        @"
# Placeholder: $f
# Add documentation or move files here.
"@ | Out-File -FilePath $filePath -Encoding UTF8
        Write-Host "Created placeholder: $f" -ForegroundColor Green
    } else {
        Write-Host "Placeholder exists: $f" -ForegroundColor DarkYellow
    }
}

Write-Host "
Folder structure creation complete. Review created directories and placeholders." -ForegroundColor Cyan

Write-Host "To undo: remove created directories manually or use Git to discard them if not committed." -ForegroundColor Magenta

exit 0
