# Build Docker Images

# Build backend
Write-Host "Building backend..." -ForegroundColor Green
Set-Location -Path ".\Backend-app"
docker build -t backend-app .
if ($LASTEXITCODE -ne 0) {
    Write-Host "Backend build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "Backend build completed successfully!" -ForegroundColor Green
Write-Host ""

# Build frontend
Write-Host "Building frontend..." -ForegroundColor Green
Set-Location -Path "..\Frontend-app"
docker build -t frontend-app .
if ($LASTEXITCODE -ne 0) {
    Write-Host "Frontend build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "Frontend build completed successfully!" -ForegroundColor Green
Write-Host ""

# Return to root
Set-Location -Path ".."
Write-Host "All builds completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "To run the application:"
Write-Host "1. Using docker-compose: docker-compose up -d"
Write-Host "2. Using individual containers:"
Write-Host "   - Backend: docker run -d -p 3000:3000 -p 3001:3001 backend-app"
Write-Host "   - Frontend: docker run -d -p 80:80 frontend-app"