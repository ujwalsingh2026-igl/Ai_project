# ==============================================================================
# Aegis Autonomous Command Center - Android APK Build Pipeline
# Packages the frontend into a standalone Android APK (.apk)
# ==============================================================================

param(
    [switch]$Release = $false
)

$ErrorActionPreference = "Stop"
$scriptRoot = $PSScriptRoot
$projectRoot = Split-Path $scriptRoot -Parent
$frontendDir = Join-Path $projectRoot "frontend"
$androidDir = Join-Path $frontendDir "android"
$outApkRoot = Join-Path $projectRoot "aegis-command-center.apk"
$outApkWeb = Join-Path $frontendDir "dist\aegis-command-center.apk"
$outApkPublic = Join-Path $frontendDir "public\aegis-command-center.apk"

# JDK 21 detection
$jdk21 = "C:\Program Files\Microsoft\jdk-21.0.12.101-hotspot"
if (-not (Test-Path $jdk21)) {
    $found = Get-ChildItem "C:\Program Files\Microsoft" -Recurse -Filter "java.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found) {
        $jdk21 = Split-Path (Split-Path $found.FullName -Parent) -Parent
    } else {
        Write-Error "Microsoft OpenJDK 21 not found. Please install via: winget install Microsoft.OpenJDK.21"
        exit 1
    }
}

$androidSdk = "C:\Users\dell\AppData\Local\Android\Sdk"
if (-not (Test-Path $androidSdk)) {
    Write-Error "Android SDK not found at $androidSdk"
    exit 1
}

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "         BUILDING AEGIS STANDALONE ANDROID APK (.APK)             " -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "[*] JDK Engine  : $jdk21" -ForegroundColor Yellow
Write-Host "[*] Android SDK : $androidSdk" -ForegroundColor Yellow

# Step 1: Build production web bundle
Write-Host "[*] Step 1/3: Compiling responsive frontend bundle..." -ForegroundColor Yellow
$fnm = "C:\Users\dell\AppData\Roaming\fnm\node-versions\v24.21.0\installation"
$env:PATH = "$fnm;" + $env:PATH
Set-Location $frontendDir
npm run build

# Step 2: Sync to native Android project
Write-Host "[*] Step 2/3: Syncing web bundle to native Android project..." -ForegroundColor Yellow
npx cap sync android

# Step 3: Compile APK with Gradle
Write-Host "[*] Step 3/3: Compiling APK using Gradle & OpenJDK 21..." -ForegroundColor Yellow
Set-Location $androidDir

$gradleCmd = "set JAVA_HOME=$jdk21&& set ANDROID_HOME=$androidSdk&& .\gradlew.bat assembleDebug"
cmd.exe /c $gradleCmd

$builtApk = Join-Path $androidDir "app\build\outputs\apk\debug\app-debug.apk"
if (Test-Path $builtApk) {
    Copy-Item $builtApk -Destination $outApkRoot -Force
    Copy-Item $builtApk -Destination $outApkWeb -Force
    Copy-Item $builtApk -Destination $outApkPublic -Force
    $size = (Get-Item $outApkRoot).Length / 1MB
    Write-Host ""
    Write-Host "[OK] Android APK Compiled Successfully!" -ForegroundColor Green
    Write-Host "     Output: $outApkRoot ({0:N2} MB)" -f $size -ForegroundColor White
    Write-Host "     Direct Phone Download (Wi-Fi): http://10.227.244.161:5173/aegis-command-center.apk" -ForegroundColor Cyan
} else {
    Write-Error "APK file was not generated at expected location: $builtApk"
}

Set-Location $projectRoot
