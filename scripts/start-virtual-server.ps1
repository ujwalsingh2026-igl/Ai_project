# ==============================================================================
# Aegis Autonomous Command Center - Hardened Virtual Server Launcher
# Guarantees the CIA Triad (Confidentiality, Integrity, Availability)
# ==============================================================================

param(
    [switch]$AuditOnly = $false,
    [switch]$NoTunnel = $false
)

$ErrorActionPreference = "Continue"
$scriptDir = $PSScriptRoot
$projectDir = Split-Path $scriptDir -Parent
$pythonExe = Join-Path $projectDir "backend\.venv\Scripts\python.exe"
$virtualServerScript = Join-Path $projectDir "infrastructure\virtual_server.py"

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "   AEGIS HARDENED VIRTUAL SERVER HOST (CIA TRIAD ENFORCEMENT)     " -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan

if (-not (Test-Path $pythonExe)) {
    $pythonExe = "python"
}

if ($AuditOnly) {
    & $pythonExe $virtualServerScript --audit-only
    exit $LASTEXITCODE
}

$tunnelArgs = if ($NoTunnel) { "--no-tunnel" } else { "" }

Write-Host "[+] Initializing CIA Triad Virtual Host..." -ForegroundColor Green
Write-Host "    * Confidentiality : Upstream services bound strictly to 127.0.0.1 (Loopback Isolated)" -ForegroundColor Gray
Write-Host "    * Integrity       : Strict Security Headers (nosniff, DENY, same-origin) + Zero-Trust Ingress" -ForegroundColor Gray
Write-Host "    * Availability    : Autonomous Watchdog with Self-Healing Restart Circuit" -ForegroundColor Gray
Write-Host ""

& $pythonExe $virtualServerScript $tunnelArgs
