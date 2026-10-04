# ==============================================================================
# Aegis Autonomous Command Center - Install Permanent Windows Background Service
# ==============================================================================

param(
    [switch]$EnableTunnel = $true
)

$ErrorActionPreference = "Stop"
$scriptRoot = $PSScriptRoot
$vbsPath = Join-Path $scriptRoot "run-daemon-hidden.vbs"
$taskName = "AegisCommandCenterService"

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "    INSTALLING AEGIS AS PERMANENT WINDOWS BACKGROUND SERVICE      " -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan

# 1. Unregister any existing task
try {
    $existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    if ($existing) {
        Write-Host "[*] Removing previous service task registration..." -ForegroundColor Yellow
        Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    }
} catch {
    # Ignore if not present
}

# 2. Define Action: Execute silent launcher with wscript.exe
$action = New-ScheduledTaskAction -Execute "wscript.exe" -Argument "`"$vbsPath`""

# 3. Define Trigger: AtLogon for current user
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME

# 4. Define Settings
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -ExecutionTimeLimit (New-TimeSpan -Days 365) `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -StartWhenAvailable

# 5. Register Task
Write-Host "[*] Registering Scheduled Task '$taskName'..." -ForegroundColor Yellow
Register-ScheduledTask `
    -TaskName $taskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Description "Aegis Autonomous Command Center 24/7 background supervisor daemon." | Out-Null

Write-Host "[OK] Task '$taskName' registered successfully." -ForegroundColor Green

# 6. Start Task Now
Write-Host "[*] Starting permanent background daemon immediately..." -ForegroundColor Yellow
Start-ScheduledTask -TaskName $taskName
Start-Sleep -Seconds 4

Write-Host ""
Write-Host "==================================================================" -ForegroundColor Green
Write-Host "           PERMANENT BACKGROUND SERVICE ACTIVE                    " -ForegroundColor Green
Write-Host "==================================================================" -ForegroundColor Green
Write-Host ""
Write-Host " The service will now run 24/7 in the background silently." -ForegroundColor White
Write-Host " It will automatically start whenever your computer boots or logs in." -ForegroundColor White
Write-Host ""
Write-Host " Management Commands:" -ForegroundColor Cyan
Write-Host "  - Check Status   : .\aegis status" -ForegroundColor Gray
Write-Host "  - View Logs      : Get-Content backend\logs\service_daemon.log -Tail 20" -ForegroundColor Gray
Write-Host "  - Public Tunnel  : Get-Content backend\logs\tunnel_url.txt" -ForegroundColor Gray
Write-Host "  - Uninstall      : powershell .\scripts\uninstall-permanent-service.ps1" -ForegroundColor Gray
Write-Host ""
