# Playzy Market - lokalnyy zapusk
Write-Host "Zapusk Playzy Market..." -ForegroundColor Cyan

# 1. Ustanovka zavisimostey
Write-Host "Ustanavlivayu zavisimosti..." -ForegroundColor Yellow
pnpm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "Oshibka ustanovki zavisimostey" -ForegroundColor Red
    exit 1
}

# 2. Zapusk bekenda v fone
Write-Host "Zapuskayu bekend na portu 3000..." -ForegroundColor Yellow
$backend = Start-Process -FilePath "pnpm" `
    -ArgumentList "--filter", "@workspace/api-server", "dev" `
    -WorkingDirectory (Get-Location).Path `
    -PassThru -NoNewWindow

Write-Host "Bekend zapushchen (PID $($backend.Id))" -ForegroundColor Green
Write-Host "Zhdu 5 sekund..."
Start-Sleep -Seconds 5

# 3. Zapusk frontenda
Write-Host "Zapuskayu frontend na portu 5173..." -ForegroundColor Yellow
Write-Host ""
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "  Sayt: http://localhost:5173" -ForegroundColor Green
Write-Host "  API:  http://localhost:3000/api/health" -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Nazhmite Ctrl+C dlya ostanovki" -ForegroundColor Gray
Write-Host ""

pnpm --filter "@workspace/pleer" dev

# Cleanup
Write-Host "Ostanovka bekenda..." -ForegroundColor Yellow
Stop-Process -Id $backend.Id -Force -ErrorAction SilentlyContinue
Write-Host "Ostanovleno." -ForegroundColor Green
