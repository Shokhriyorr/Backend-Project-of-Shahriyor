$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
if (-not $npmCommand) {
  $npmCommand = Get-Command npm -ErrorAction Stop
}
$npm = $npmCommand.Source

Write-Host "== Academy Portal submission verification =="

Push-Location (Join-Path $root 'apps/api')
& $npm test
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& $npm run lint
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Pop-Location

Push-Location (Join-Path $root 'frontend')
& $npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Pop-Location

Push-Location $root
docker compose -f docker-compose.local.yml config
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Pop-Location

Write-Host "All local verification steps passed."
