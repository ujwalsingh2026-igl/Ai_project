# Aegis Command Center - Single Command Launcher
# Usage: .\start-cockpit.ps1

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "         AEGIS COMMAND CENTER - SYSTEM LAUNCHER           " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$scriptRoot = $PSScriptRoot
$backendDir = Join-Path $scriptRoot "backend"
$frontendDir = Join-Path $scriptRoot "frontend"

# 1. Check & Start Backend (Port 8001)
$backendPort = Get-NetTCPConnection -LocalPort 8001 -ErrorAction SilentlyContinue
if ($backendPort) {
    Write-Host "[OK] Django Backend is already active on http://127.0.0.1:8001" -ForegroundColor Green
} else {
    Write-Host "[*] Starting Django Backend on port 8001 (0.0.0.0 for LAN/mobile access)..." -ForegroundColor Yellow
    $backendCmd = 'cd "' + $backendDir + '"; .\.venv\Scripts\Activate.ps1; python manage.py runserver 0.0.0.0:8001'
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCmd -WindowStyle Normal
    Start-Sleep -Seconds 2
}

# 2. Check & Start Frontend (Port 5173)
$frontendPort = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue
if ($frontendPort) {
    Write-Host "[OK] Vite Frontend is already active on http://localhost:5173" -ForegroundColor Green
} else {
    Write-Host "[*] Starting Vite Frontend on port 5173..." -ForegroundColor Yellow
    $fnmPath = 'C:\Users\dell\AppData\Roaming\fnm\node-versions\v24.21.0\installation;'
    $frontendCmd = '$env:PATH = "' + $fnmPath + '" + $env:PATH; cd "' + $frontendDir + '"; npm run dev'
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCmd -WindowStyle Normal
    Start-Sleep -Seconds 2
}

# 3. Final Status & Instructions
Write-Host ""
Write-Host "All systems active!" -ForegroundColor Cyan
Write-Host "Frontend Cockpit : http://localhost:5173" -ForegroundColor White
Write-Host "Backend API Docs : http://127.0.0.1:8001/api/health/" -ForegroundColor White
Write-Host "Django Admin     : http://127.0.0.1:8001/admin/" -ForegroundColor White
Write-Host ""
Write-Host "Opening Cockpit at http://localhost:5173 ..." -ForegroundColor Gray
Start-Process "http://localhost:5173"
