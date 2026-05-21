$ErrorActionPreference = 'Stop'

function New-RandomSecret([int]$length = 40) {
  -join ((65..90) + (97..122) + (48..57) | Get-Random -Count $length | ForEach-Object { [char]$_ })
}

Write-Host "JWT_SECRET_KEY=$([New-RandomSecret])"
Write-Host "JWT_REFRESH_SECRET_KEY=$([New-RandomSecret])"
Write-Host "POSTGRES_PASSWORD=$([New-RandomSecret])"
