' ==============================================================================
' Aegis Autonomous Command Center - Silent Service Launcher (Zero Popups)
' ==============================================================================
Set objFSO = CreateObject("Scripting.FileSystemObject")
strScriptDir = objFSO.GetParentFolderName(WScript.ScriptFullName)
strPsScript = objFSO.BuildPath(strScriptDir, "service-daemon.ps1")

Set objShell = CreateObject("WScript.Shell")
strCommand = "powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & strPsScript & """ -EnableTunnel"

' Run with window style 0 (completely hidden) and do not wait
objShell.Run strCommand, 0, False
