# ==============================================================================
# Aegis Autonomous Command Center - Cloudflare Remote Access Tunnel
# Creates an instant, secure public HTTPS URL to access Cockpit from anywhere.
# ==============================================================================

param(
    [ValidateSet("start", "stop", "status")]
    [string]$Action = "start"
)

$scriptRoot = $PSScriptRoot
$projectRoot = Split-Path $scriptRoot -Parent
$toolsDir = Join-Path $projectRoot "tools"
$cloudflared = Join-Path $toolsDir "cloudflared.exe"
$logFile = Join-Path $projectRoot "backend\logs\cloudflared.log"
$urlFile = Join-Path $projectRoot "backend\logs\tunnel_url.txt"

if (-not (Test-Path $cloudflared)) {
    Write-Error "cloudflared.exe not found at $cloudflared"
    exit 1
}

if ($Action -eq "stop") {
    $procs = Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue
    if ($procs) {
        $procs | Stop-Process -Force
        Remove-Item -Path $urlFile -ErrorAction SilentlyContinue
        Write-Host "[OK] Cloudflare Tunnel stopped." -ForegroundColor Green
    } else {
        Write-Host "[*] No active tunnel process found." -ForegroundColor Gray
    }
    exit 0
}

if ($Action -eq "status") {
    if (Test-Path $urlFile) {
        $url = Get-Content $urlFile -Raw
        Write-Host "Active Public Tunnel URL: $url" -ForegroundColor Green
    } else {
        Write-Host "No active tunnel URL recorded." -ForegroundColor Yellow
    }
    exit 0
}

# Start Tunnel
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "         ESTABLISHING CLOUDFLARE SECURE REMOTE TUNNEL             " -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan

# Stop old processes if any
Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Remove-Item -Path $urlFile -ErrorAction SilentlyContinue
Remove-Item -Path $logFile -ErrorAction SilentlyContinue

Write-Host "[*] Connecting tunnel to http://127.0.0.1:5173..." -ForegroundColor Yellow
$proc = Start-Process -FilePath $cloudflared -ArgumentList "tunnel --url http://127.0.0.1:5173 --http-host-header localhost" -RedirectStandardError $logFile -WindowStyle Hidden -PassThru

$maxRetries = 15
$publicUrl = $null

for ($i = 0; $i -lt $maxRetries; $i++) {
    Start-Sleep -Seconds 1
    if (Test-Path $logFile) {
        $logContent = Get-Content $logFile -Raw
        if ($logContent -match "(https://[a-zA-Z0-9-]+\.trycloudflare\.com)") {
            $publicUrl = $matches[1]
            Set-Content -Path $urlFile -Value $publicUrl
            break
        }
    }
}

if ($publicUrl) {
    Write-Host ""
    Write-Host "[SUCCESS] Remote Tunnel Established!" -ForegroundColor Green
    Write-Host "Public Secure URL : $publicUrl" -ForegroundColor Cyan
    Write-Host "Local Endpoint    : http://localhost:5173" -ForegroundColor White
    Write-Host ""
    Write-Host "You can now open $publicUrl from any phone, laptop, or browser worldwide!" -ForegroundColor White
} else {
    Write-Host "[!] Tunnel started, waiting for URL negotiation. Check: Get-Content backend\logs\cloudflared.log" -ForegroundColor Yellow
}
