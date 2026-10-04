# ==============================================================================
# Aegis Autonomous Command Center - Uninstall Permanent Windows Background Service
# ==============================================================================

$taskName = "AegisCommandCenterService"

Write-Host "==================================================================" -ForegroundColor Yellow
Write-Host "    REMOVING AEGIS PERMANENT WINDOWS BACKGROUND SERVICE           " -ForegroundColor Yellow
Write-Host "==================================================================" -ForegroundColor Yellow

try {
    $existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    if ($existing) {
        Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
        Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
        Write-Host "[OK] Task '$taskName' successfully removed." -ForegroundColor Green
    } else {
        Write-Host "[*] No active task named '$taskName' was found." -ForegroundColor Gray
    }
} catch {
    Write-Host "[!] Error unregistering task: $($_.Exception.Message)" -ForegroundColor Red
}

# Stop any running cloudflared process
Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host "Service uninstalled. The app will no longer auto-start on boot." -ForegroundColor Green
