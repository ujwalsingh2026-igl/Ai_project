# Script to convert Android App Bundle (.aab) to a universal installable APK (.apk)
# Using Google's official bundletool

param(
    [string]$AabPath = "aegis-command-center.aab",
    [string]$OutputApk = "aegis-from-bundle.apk"
)

$ErrorActionPreference = "Stop"

$ProjectRoot = (Get-Item $PSScriptRoot).Parent.FullName
$ToolsDir = Join-Path $ProjectRoot "tools"
$BundletoolJar = Join-Path $ToolsDir "bundletool.jar"
$BundletoolVersion = "1.18.3"
$BundletoolUrl = "https://github.com/google/bundletool/releases/download/$BundletoolVersion/bundletool-all-$BundletoolVersion.jar"

if (!(Test-Path $ToolsDir)) {
    New-Item -ItemType Directory -Path $ToolsDir | Out-Null
}

# 1. Download bundletool if not already present
if (!(Test-Path $BundletoolJar)) {
    Write-Host "[+] Downloading Google bundletool v$BundletoolVersion..." -ForegroundColor Cyan
    Invoke-WebRequest -Uri $BundletoolUrl -OutFile $BundletoolJar -UseBasicParsing
    Write-Host "[+] Download complete: $BundletoolJar" -ForegroundColor Green
}

# Find Java
$JavaExe = "java"
if ($env:JAVA_HOME -and (Test-Path "$env:JAVA_HOME\bin\java.exe")) {
    $JavaExe = "$env:JAVA_HOME\bin\java.exe"
} elseif (Test-Path "C:\Program Files\Microsoft\jdk-21.0.12.101-hotspot\bin\java.exe") {
    $JavaExe = "C:\Program Files\Microsoft\jdk-21.0.12.101-hotspot\bin\java.exe"
}

$AabFile = Join-Path $ProjectRoot $AabPath
if (!(Test-Path $AabFile)) {
    Write-Error "[-] Input AAB file not found at: $AabFile"
    exit 1
}

$ApksArchive = Join-Path $ProjectRoot "temp-bundle.apks"
if (Test-Path $ApksArchive) { Remove-Item $ApksArchive -Force }

$FinalApk = Join-Path $ProjectRoot $OutputApk
if (Test-Path $FinalApk) { Remove-Item $FinalApk -Force }

Write-Host "[+] Converting $AabPath to APK using bundletool..." -ForegroundColor Cyan
Write-Host "[+] Java: $JavaExe"

# 2. Build universal APK archive (.apks) from .aab
# Notice: For debug AABs or signed AABs, bundletool creates a universal APK
& $JavaExe -jar $BundletoolJar build-apks `
    --bundle="$AabFile" `
    --output="$ApksArchive" `
    --mode=universal

if (!(Test-Path $ApksArchive)) {
    Write-Error "[-] Failed to generate .apks archive from AAB."
    exit 1
}

Write-Host "[+] Extracting universal APK from archive..." -ForegroundColor Cyan

# 3. An .apks archive is a zip file containing 'universal.apk'
$TempExtractDir = Join-Path $ProjectRoot "temp_extract_apks"
if (Test-Path $TempExtractDir) { Remove-Item $TempExtractDir -Recurse -Force }
New-Item -ItemType Directory -Path $TempExtractDir | Out-Null

Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::ExtractToDirectory($ApksArchive, $TempExtractDir)

$ExtractedUniversalApk = Join-Path $TempExtractDir "universal.apk"
if (!(Test-Path $ExtractedUniversalApk)) {
    # If nested inside a subfolder, search
    $Found = Get-ChildItem -Path $TempExtractDir -Filter "*.apk" -Recurse | Select-Object -First 1
    if ($Found) {
        $ExtractedUniversalApk = $Found.FullName
    }
}

if (Test-Path $ExtractedUniversalApk) {
    Copy-Item $ExtractedUniversalApk $FinalApk -Force
    $SizeMB = [math]::Round((Get-Item $FinalApk).Length / 1MB, 2)
    Write-Host "[+] SUCCESS! Generated standalone universal APK from AAB: $FinalApk ($SizeMB MB)" -ForegroundColor Green
} else {
    Write-Error "[-] universal.apk not found inside the generated archive."
}

# Cleanup
if (Test-Path $ApksArchive) { Remove-Item $ApksArchive -Force }
if (Test-Path $TempExtractDir) { Remove-Item $TempExtractDir -Recurse -Force }
