$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$outFile = Join-Path $root 'deployrocks.env.local'
$example = Join-Path $root 'deployrocks.env.example'

if (-not (Test-Path $example)) {
  throw "Missing deployrocks.env.example"
}

function New-RandomSecret {
  param([int]$Length = 40)
  -join ((65..90) + (97..122) + (48..57) | Get-Random -Count $Length | ForEach-Object { [char]$_ })
}

$content = Get-Content $example -Raw
$content = $content -replace 'JWT_SECRET_KEY=.*', "JWT_SECRET_KEY=$(New-RandomSecret)"
$content = $content -replace 'JWT_REFRESH_SECRET_KEY=.*', "JWT_REFRESH_SECRET_KEY=$(New-RandomSecret)"

Set-Content -Path $outFile -Value $content -Encoding UTF8

Write-Host ""
Write-Host "Created: deployrocks.env.local"
Write-Host "1) Open DeployRocks -> Environment"
Write-Host "2) Paste ALL lines from deployrocks.env.local"
Write-Host "3) Set SMTP_PASS and EMAIL_FROM_ADDRESS to your real SMTP"
Write-Host "4) Settings -> Compose file = compose.deployrocks.yaml (root docker-compose.yml is safe fallback)"
Write-Host "5) Delete app ...-worker if it exists"
Write-Host "6) Retry deploy (twice if network error)"
Write-Host ""
