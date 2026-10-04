@echo off
title Aegis Autonomous Command Center - Launcher
cd /d "%~dp0"

echo ==================================================================
echo       AEGIS AUTONOMOUS COMMAND CENTER // DESKTOP LAUNCHER
echo ==================================================================
echo.
echo [*] Starting Aegis Desktop GUI Controller...
start "" "backend\.venv\Scripts\pythonw.exe" aegis_gui.py

echo [OK] Aegis Controller is active.
exit
