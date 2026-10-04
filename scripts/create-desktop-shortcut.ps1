# ==============================================================================
# Aegis Autonomous Command Center - Windows Desktop Shortcut Creator
# Creates 1-click desktop and start menu shortcuts for Laptop / PC use
# ==============================================================================

$WshShell = New-Object -ComObject WScript.Shell
$scriptRoot = $PSScriptRoot
$projectRoot = Split-Path $scriptRoot -Parent
$desktopPath = [System.Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktopPath "Aegis Command Center.lnk"

$pyw = Join-Path $projectRoot "backend\.venv\Scripts\pythonw.exe"
if (-not (Test-Path $pyw)) {
    $pyw = "pythonw.exe"
}

$guiScript = Join-Path $projectRoot "aegis_gui.py"
$iconPath = Join-Path $projectRoot "frontend\android\app\src\main\res\mipmap-xxhdpi\ic_launcher.png"

$shortcut = $WshShell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $pyw
$shortcut.Arguments = "`"$guiScript`""
$shortcut.WorkingDirectory = $projectRoot
$shortcut.Description = "Aegis Autonomous Command Center - Desktop Controller"
if (Test-Path $iconPath) {
    $shortcut.IconLocation = "$iconPath,0"
}
$shortcut.Save()

Write-Host "[OK] Desktop Shortcut Created at: $shortcutPath" -ForegroundColor Green
