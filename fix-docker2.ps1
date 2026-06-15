# Fix Docker config properly
$configPath = Join-Path $env:USERPROFILE '.docker\config.json'
$newConfig = @{
    auths = @{}
    currentContext = "desktop-linux"
} | ConvertTo-Json -Depth 5
Set-Content -Path $configPath -Value $newConfig -Force
Write-Host "Docker config reset to valid JSON" -ForegroundColor Green
