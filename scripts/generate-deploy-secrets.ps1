$ErrorActionPreference = 'Stop'

function New-RandomSecret {
  param([int]$Length = 40)
  -join ((65..90) + (97..122) + (48..57) | Get-Random -Count $Length | ForEach-Object { [char]$_ })
}

$access = New-RandomSecret
$refresh = New-RandomSecret

Write-Output "JWT_SECRET_KEY=$access"
Write-Output "JWT_REFRESH_SECRET_KEY=$refresh"
