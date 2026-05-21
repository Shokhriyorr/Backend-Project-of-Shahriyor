$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

Write-Host "Starting Cloudflare tunnel to http://localhost:8081 ..."
Write-Host "Keep this window open during defense. URL changes each run."

Push-Location $root
npx --yes cloudflared tunnel --url http://localhost:8081
