# HealthMitra Self-Hosted Database Starter
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " Starting Self-Hosted PostgreSQL & Adminer" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Check if Docker is accessible
docker info 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "[!] Docker daemon is not responding." -ForegroundColor Yellow
    Write-Host "    Please ensure Docker Desktop is open and running, then try again." -ForegroundColor Yellow
    exit 1
}

# Start PostgreSQL and Adminer services in detached mode
docker compose up -d postgres adminer

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n[✓] Services started successfully!" -ForegroundColor Green
    Write-Host "    PostgreSQL Port:  5432" -ForegroundColor White
    Write-Host "    Database:         healthmitra_db" -ForegroundColor White
    Write-Host "    Username:         postgres" -ForegroundColor White
    Write-Host "    Password:         postgres" -ForegroundColor White
    Write-Host "    Adminer Web GUI:  http://localhost:8080" -ForegroundColor Cyan
    Write-Host "`nTo start the FastAPI backend:" -ForegroundColor Cyan
    Write-Host "    uv run uvicorn backend_h.main:app --reload --host 0.0.0.0 --port 8000" -ForegroundColor Gray
} else {
    Write-Host "[x] Failed to start containers." -ForegroundColor Red
    exit 1
}
