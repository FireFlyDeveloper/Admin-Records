# Fix Docker credential store issue
$configPath = Join-Path $env:USERPROFILE '.docker\config.json'
if (Test-Path $configPath) {
    $content = Get-Content $configPath -Raw
    $fixed = $content -replace '"credsStore":\s*"desktop"', ''
    $fixed = $fixed -replace ',\s*}', '}'  # Remove trailing comma before }
    Set-Content -Path $configPath -Value $fixed -Force
    Write-Host "Docker config fixed - removed credential store" -ForegroundColor Green
} else {
    Write-Host "Docker config not found" -ForegroundColor Yellow
}
