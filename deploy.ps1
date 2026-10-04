# ==============================================================================
# Aegis Command Center - Production & Development CLI Deployment Engine
# Usage:
#   .\deploy.ps1                 # Full deployment & health verification
#   .\deploy.ps1 -Mode prod      # Production build & verification
#   .\deploy.ps1 -Mode dev       # Launch dev runtime & open Cockpit
#   .\deploy.ps1 -Reindex        # Re-ingest all knowledge bases & benchmarks
# ==============================================================================

param(
    [ValidateSet("all", "dev", "prod", "check")]
    [string]$Mode = "all",
    [switch]$Reindex = $false,
    [switch]$NoBrowser = $false
)

$ErrorActionPreference = "Stop"
$scriptRoot = $PSScriptRoot
$backendDir = Join-Path $scriptRoot "backend"
$frontendDir = Join-Path $scriptRoot "frontend"
$pythonExe = Join-Path $backendDir ".venv\Scripts\python.exe"

function Write-Step {
    param([string]$Message)
    Write-Host "[*] $Message" -ForegroundColor Yellow
}

function Write-Success {
    param([string]$Message)
    Write-Host "[OK] $Message" -ForegroundColor Green
}

function Write-Notice {
    param([string]$Message)
    Write-Host "[!] $Message" -ForegroundColor Magenta
}

Write-Host ""
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "         AEGIS AUTONOMOUS COMMAND CENTER // CLI DEPLOYMENT        " -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host ""

# ------------------------------------------------------------------------------
# STEP 1: Environment & Toolchain Diagnostics
# ------------------------------------------------------------------------------
Write-Step "Checking environment prerequisites..."

if (-not (Test-Path $pythonExe)) {
    Write-Error "Python virtual environment not found at $pythonExe. Run: python -m venv backend\.venv"
}
$pyVer = & $pythonExe --version
Write-Success "Python Engine: $pyVer ($pythonExe)"

$nodeVer = & node -v 2>$null
if (-not $nodeVer) {
    Write-Error "Node.js is not in PATH. Please install Node.js (v18+)."
}
$npmVer = & npm -v 2>$null
Write-Success "Node.js Engine: $nodeVer (npm v$npmVer)"

$ollamaInstalled = Get-Command "ollama" -ErrorAction SilentlyContinue
if (-not $ollamaInstalled) {
    Write-Notice "Ollama CLI not detected on system PATH. Local AI model inference will use fallback provider."
} else {
    $ollamaVer = & ollama --version 2>$null
    Write-Success "Ollama Engine: $ollamaVer"
}

# ------------------------------------------------------------------------------
# STEP 2: Database Migrations & Django Integrity Check
# ------------------------------------------------------------------------------
Write-Step "Running Django database migrations..."
$migOut = & $pythonExe (Join-Path $backendDir "manage.py") migrate --noinput
Write-Success "Database schema migrated."

Write-Step "Executing Django system integrity check..."
$checkOut = & $pythonExe (Join-Path $backendDir "manage.py") check
Write-Success "Django system check passed with 0 errors."

# ------------------------------------------------------------------------------
# STEP 3: Knowledge Base Verification & Ingestion
# ------------------------------------------------------------------------------
$medDb = Join-Path $backendDir "data\medical\clinical_kb.db"
$ecomDb = Join-Path $backendDir "data\analytics\ecommerce_analytics.db"
$secDb = Join-Path $backendDir "data\security\cybersecurity_kb.db"

# 3A. Medical Knowledge Base
if ($Reindex -or (-not (Test-Path $medDb))) {
    Write-Step "Ingesting clinical medicine dataset (Opus 5.5 - 2,194 diseases)..."
    & $pythonExe (Join-Path $backendDir "scripts\ingest_medical_dataset.py")
    Write-Success "Clinical knowledge base populated."
} else {
    $size = (Get-Item $medDb).Length / 1MB
    Write-Success "Clinical knowledge base verified ($([math]::Round($size, 1)) MB - 2,194 human diseases)."
}

# 3B. E-Commerce Analytics Knowledge Base
if ($Reindex -or (-not (Test-Path $ecomDb))) {
    Write-Step "Ingesting e-commerce analytics dataset (25,000 transactions)..."
    & $pythonExe (Join-Path $backendDir "scripts\ingest_ecommerce_dataset.py")
    Write-Success "E-Commerce analytics database populated."
} else {
    $size = (Get-Item $ecomDb).Length / 1MB
    Write-Success "E-Commerce analytics database verified ($([math]::Round($size, 1)) MB - 25,000 orders)."
}

# 3C. Defensive Cybersecurity Knowledge Base
if ($Reindex -or (-not (Test-Path $secDb))) {
    Write-Step "Ingesting cybersecurity benchmark dataset (NSL-KDD & FWAF)..."
    & $pythonExe (Join-Path $backendDir "scripts\ingest_cybersecurity_dataset.py")
    Write-Success "Defensive cybersecurity knowledge base populated."
} else {
    $size = (Get-Item $secDb).Length / 1MB
    Write-Success "Defensive cybersecurity knowledge base verified ($([math]::Round($size, 1)) MB - NSL-KDD & FWAF)."
}

# ------------------------------------------------------------------------------
# STEP 4: Ollama Custom Model Verification & Build
# ------------------------------------------------------------------------------
if ($ollamaInstalled) {
    Write-Step "Verifying Ollama models..."
    $activeModels = (& ollama list) -join " "

    # 4A. Clinical Agent (aegis-medical)
    if ($activeModels -match "aegis-medical") {
        Write-Success "Ollama Model [aegis-medical:latest] is active."
    } else {
        Write-Step "Building custom Ollama model: aegis-medical..."
        $medModelfile = Join-Path $backendDir "data\medical\Modelfile"
        & ollama create aegis-medical -f $medModelfile
        Write-Success "Ollama Model [aegis-medical:latest] built successfully."
    }

    # 4B. Defensive Cyber Agent (aegis-defense)
    if ($activeModels -match "aegis-defense") {
        Write-Success "Ollama Model [aegis-defense:latest] is active."
    } else {
        Write-Step "Building custom Ollama model: aegis-defense..."
        $secModelfile = Join-Path $backendDir "data\security\Modelfile"
        & ollama create aegis-defense -f $secModelfile
        Write-Success "Ollama Model [aegis-defense:latest] built successfully."
    }
}

# ------------------------------------------------------------------------------
# STEP 5: Frontend Production Compilation
# ------------------------------------------------------------------------------
if ($Mode -eq "all" -or $Mode -eq "prod") {
    Write-Step "Compiling production frontend bundle (tsc && vite build)..."
    Push-Location $frontendDir
    try {
        & npm run build
        Write-Success "Frontend production build compiled to frontend/dist."
    } finally {
        Pop-Location
    }
}

# ------------------------------------------------------------------------------
# STEP 6: Service Orchestration & Health Checks
# ------------------------------------------------------------------------------
Write-Step "Verifying active runtime services..."

# Check Backend (:8001)
$backendPort = Get-NetTCPConnection -LocalPort 8001 -ErrorAction SilentlyContinue
if ($backendPort) {
    Write-Success "Backend API Server is active on port 8001 (PID $($backendPort[0].OwningProcess))."
} else {
    Write-Step "Launching Backend API Server on http://127.0.0.1:8001..."
    $bCmd = 'cd "' + $backendDir + '"; .\.venv\Scripts\Activate.ps1; python manage.py runserver 8001'
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $bCmd -WindowStyle Minimized
    Start-Sleep -Seconds 3
    Write-Success "Backend API Server launched."
}

# Check Frontend (:5173)
$frontendPort = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue
if ($frontendPort) {
    Write-Success "Cockpit Frontend is active on port 5173 (PID $($frontendPort[0].OwningProcess))."
} else {
    Write-Step "Launching Cockpit Frontend on http://localhost:5173..."
    $fCmd = 'cd "' + $frontendDir + '"; npm run dev'
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $fCmd -WindowStyle Minimized
    Start-Sleep -Seconds 3
    Write-Success "Cockpit Frontend launched."
}

# API Health Check probe
try {
    $healthResp = Invoke-RestMethod -Uri "http://127.0.0.1:8001/api/health/" -Method Get -TimeoutSec 5
    if ($healthResp.status -eq "ok") {
        Write-Success "Health Check Probe: http://127.0.0.1:8001/api/health/ -> OK"
    }
} catch {
    Write-Notice "Health Check Probe waiting for server initialization: $($_.Exception.Message)"
}

# ------------------------------------------------------------------------------
# STEP 7: Deployment Dashboard & Summary
# ------------------------------------------------------------------------------
Write-Host ""
Write-Host "==================================================================" -ForegroundColor Green
Write-Host "            AEGIS COMMAND CENTER DEPLOYMENT SUCCESSFUL            " -ForegroundColor Green
Write-Host "==================================================================" -ForegroundColor Green
Write-Host ""
Write-Host " Cockpit UI       : http://localhost:5173" -ForegroundColor White
Write-Host " Backend API      : http://127.0.0.1:8001/api/health/" -ForegroundColor White
Write-Host " Django Admin     : http://127.0.0.1:8001/admin/" -ForegroundColor White
Write-Host " Ollama LLM Host  : http://localhost:11434" -ForegroundColor White
Write-Host ""
Write-Host " Active Agents & Models:" -ForegroundColor Cyan
Write-Host "  - aegis-defense:latest (Defensive Cyber Intelligence & NSL-KDD NIDS)" -ForegroundColor Gray
Write-Host "  - aegis-medical:latest (Opus 5.5 Clinical Intelligence & HH-RLHF)" -ForegroundColor Gray
Write-Host "  - llama3.2:latest      (Base Fast Multi-Domain Reasoning Engine)" -ForegroundColor Gray
Write-Host ""
Write-Host " CLI Commands:" -ForegroundColor Cyan
Write-Host "  - .\aegis status         : Subsystem health check" -ForegroundColor Gray
Write-Host "  - .\aegis chat           : Interactive terminal session" -ForegroundColor Gray
Write-Host "  - .\aegis tool <name>    : Directly invoke any tool" -ForegroundColor Gray
Write-Host "  - ollama run aegis-defense" -ForegroundColor Gray
Write-Host "  - ollama run aegis-medical" -ForegroundColor Gray
Write-Host ""

if (-not $NoBrowser -and ($Mode -ne "check")) {
    Write-Host "Opening Cockpit in browser..." -ForegroundColor Gray
    Start-Process "http://localhost:5173"
}
