# ==============================================================================
# Aegis Autonomous Command Center - Permanent Windows Service Daemon
# Continuously supervises:
#  1. Django Backend Server (Port 8001)
#  2. Frontend Cockpit (Port 5173 - Production Preview / Dev)
#  3. Ollama LLM Engine (Port 11434)
#  4. Cloudflare Tunnel (Public HTTPS Remote Access)
# ==============================================================================

param(
    [switch]$EnableTunnel = $false,
    [string]$TunnelDomain = ""
)

$ErrorActionPreference = "Continue"
$scriptRoot = $PSScriptRoot
$projectRoot = Split-Path $scriptRoot -Parent
$backendDir = Join-Path $projectRoot "backend"
$frontendDir = Join-Path $projectRoot "frontend"
$toolsDir = Join-Path $projectRoot "tools"
$logDir = Join-Path $backendDir "logs"
$daemonLog = Join-Path $logDir "service_daemon.log"
$tunnelUrlFile = Join-Path $logDir "tunnel_url.txt"

New-Item -ItemType Directory -Force -Path $logDir | Out-Null

function Log-Daemon {
    param([string]$Text)
    $ts = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    $line = "[$ts] $Text"
    Add-Content -Path $daemonLog -Value $line
}

Log-Daemon "=== Aegis Background Service Daemon Started ==="

$pythonExe = Join-Path $backendDir ".venv\Scripts\python.exe"
$cloudflaredExe = Join-Path $toolsDir "cloudflared.exe"

$backendProc = $null
$frontendProc = $null
$tunnelProc = $null

function Test-Port {
    param([int]$Port)
    $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    return ($null -ne $conn)
}

function Ensure-Ollama {
    if (-not (Test-Port 11434)) {
        Log-Daemon "Ollama not responding on port 11434. Launching 'ollama serve'..."
        Start-Process "ollama" -ArgumentList "serve" -WindowStyle Hidden
        Start-Sleep -Seconds 3
    }
}

function Ensure-Backend {
    if (-not (Test-Port 8001)) {
        Log-Daemon "Backend API down on port 8001. Launching Django service..."
        $script = "cd `"$backendDir`"; & `"$pythonExe`" manage.py runserver 8001"
        Start-Process "powershell" -ArgumentList "-WindowStyle", "Hidden", "-Command", $script -WindowStyle Hidden
        Start-Sleep -Seconds 3
    }
}

function Ensure-Frontend {
    if (-not (Test-Port 5173)) {
        Log-Daemon "Frontend Cockpit down on port 5173. Launching static production preview..."
        $fnmNode = "C:\Users\dell\AppData\Roaming\fnm\node-versions\v24.21.0\installation"
        $pathPrefix = if (Test-Path $fnmNode) { "`$env:PATH = `"$fnmNode;`" + `$env:PATH; " } else { "" }
        $distPath = Join-Path $frontendDir "dist"
        if (Test-Path $distPath) {
            $script = "$pathPrefix cd `"$frontendDir`"; npm run preview -- --port 5173 --host 0.0.0.0"
        } else {
            $script = "$pathPrefix cd `"$frontendDir`"; npm run dev -- --host 0.0.0.0"
        }
        Start-Process "powershell" -ArgumentList "-WindowStyle", "Hidden", "-Command", $script -WindowStyle Hidden
        Start-Sleep -Seconds 3
    }
}

function Ensure-Tunnel {
    if ($EnableTunnel -and (Test-Path $cloudflaredExe)) {
        $cfProc = Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue
        if (-not $cfProc) {
            Log-Daemon "Starting Cloudflare Quick Tunnel to http://127.0.0.1:5173..."
            $tunnelLog = Join-Path $logDir "cloudflared.log"
            $tArgs = "tunnel --url http://127.0.0.1:5173 --http-host-header localhost"
            $tProc = Start-Process -FilePath $cloudflaredExe -ArgumentList $tArgs -RedirectStandardError $tunnelLog -WindowStyle Hidden -PassThru
            Start-Sleep -Seconds 5
            
            # Read tunnel URL from log
            if (Test-Path $tunnelLog) {
                $content = Get-Content $tunnelLog -Raw
                if ($content -match "(https://[a-zA-Z0-9-]+\.trycloudflare\.com)") {
                    $url = $matches[1]
                    Set-Content -Path $tunnelUrlFile -Value $url
                    Log-Daemon "Public Cloudflare Tunnel established: $url"
                }
            }
        }
    }
}

# Initial startup pass
Ensure-Ollama
Ensure-Backend
Ensure-Frontend
if ($EnableTunnel) {
    Ensure-Tunnel
}

Log-Daemon "All initial services supervised and operational."

# Infinite watchdog loop (runs quietly in background every 20 seconds)
while ($true) {
    try {
        Start-Sleep -Seconds 20
        Ensure-Ollama
        Ensure-Backend
        Ensure-Frontend
        if ($EnableTunnel) {
            Ensure-Tunnel
        }
    } catch {
        Log-Daemon "Watchdog cycle error: $($_.Exception.Message)"
    }
}
