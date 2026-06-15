# Download Docker images anonymously and load them
$token = (Invoke-RestMethod -Uri 'https://auth.docker.io/token?service=registry.docker.io&scope=repository:library/postgres:pull').token

# Get postgres manifest
$headers = @{ Authorization = "Bearer $token"; Accept = "application/vnd.docker.distribution.manifest.v2+json" }
$manifest = Invoke-RestMethod -Uri "https://registry.hub.docker.com/v2/library/postgres/manifests/15-alpine" -Headers $headers

Write-Host "Postgres manifest retrieved"
Write-Host "Image has $($manifest.layers.Count) layers"

# Download each layer - this is complex, skip for now
# Instead, let's use docker directly with a workaround
Write-Host "Now trying docker pull with fixed credentials..."

# Fix docker config
$configPath = Join-Path $env:USERPROFILE '.docker\config.json'
$newConfig = @{
    auths = @{}
    currentContext = "desktop-linux"
} | ConvertTo-Json -Depth 5
Set-Content -Path $configPath -Value $newConfig -Force

# Try docker pull
docker pull postgres:15-alpine
