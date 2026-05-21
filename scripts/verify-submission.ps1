$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
if (-not $npmCommand) {
  $npmCommand = Get-Command npm -ErrorAction Stop
}
$npm = $npmCommand.Source

$env:NODE_ENV = 'test'
if (-not $env:DATABASE_URL) {
  $env:DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/academy_db'
}
if (-not $env:REDIS_URL) {
  $env:REDIS_URL = 'redis://localhost:6379'
}
$env:JWT_SECRET = 'local-verify-secret-with-at-least-32-characters'
$env:JWT_SECRET_KEY = $env:JWT_SECRET
if (-not $env:JWT_REFRESH_SECRET_KEY) {
  $env:JWT_REFRESH_SECRET_KEY = 'local-verify-refresh-secret-with-at-least-32-characters'
}

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
docker compose -f docker-compose.yml config
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Pop-Location

Write-Host "All local verification steps passed."
