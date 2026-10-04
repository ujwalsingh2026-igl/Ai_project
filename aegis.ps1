# Aegis Command-Line Interface (CLI) PowerShell Entrypoint
# Usage: .\aegis <command> [args...]

$pyExe = Join-Path $PSScriptRoot "backend\.venv\Scripts\python.exe"
$cliScript = Join-Path $PSScriptRoot "aegis_cli.py"

if (-not (Test-Path $pyExe)) {
    Write-Error "Python venv not found at $pyExe"
    exit 1
}

& $pyExe $cliScript @args
