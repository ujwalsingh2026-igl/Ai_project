@echo off
set "PY_EXE=%~dp0backend\.venv\Scripts\python.exe"
set "CLI_SCRIPT=%~dp0aegis_cli.py"

if not exist "%PY_EXE%" (
    echo [!] Python venv not found at %PY_EXE%
    exit /b 1
)

"%PY_EXE%" "%CLI_SCRIPT%" %*
