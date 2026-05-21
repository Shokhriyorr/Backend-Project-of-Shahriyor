$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$source = Join-Path $root 'FRONT-4'
$target = Join-Path $root 'frontend'

if (-not (Test-Path $source)) {
  Write-Host "FRONT-4 not found, using existing frontend directory."
  exit 0
}

robocopy $source $target /E /XD node_modules dist .git /NFL /NDL /NJH /NJS | Out-Null
if ($LASTEXITCODE -ge 8) {
  throw "robocopy failed with exit code $LASTEXITCODE"
}

Write-Host "Synced FRONT-4 -> frontend"
