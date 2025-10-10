# GossipIn Quick Deploy Script
# Automated Play Store deployment process

param(
    [switch]$SkipBuild,
    [switch]$SkipTests,
    [string]$Version = "1.0"
)

Write-Host "🚀 GossipIn Quick Deploy Script" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
Write-Host "🔍 Checking prerequisites..." -ForegroundColor Yellow

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ ERROR: Please run this script from the GossipApp directory" -ForegroundColor Red
    exit 1
}

# Check if Android SDK is available
if (-not (Get-Command "adb" -ErrorAction SilentlyContinue)) {
    Write-Host "⚠️  WARNING: Android SDK not found in PATH" -ForegroundColor Yellow
}

# Check if Java is available
if (-not (Get-Command "java" -ErrorAction SilentlyContinue)) {
    Write-Host "❌ ERROR: Java not found. Please install JDK 17+" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Prerequisites check completed" -ForegroundColor Green
Write-Host ""

# Update version if specified
if ($Version -ne "1.0") {
    Write-Host "📝 Updating version to $Version..." -ForegroundColor Yellow
    # Update package.json version
    $packageJson = Get-Content "package.json" | ConvertFrom-Json
    $packageJson.version = $Version
    $packageJson | ConvertTo-Json -Depth 10 | Set-Content "package.json"
    
    # Update build.gradle version
    $buildGradle = Get-Content "android\app\build.gradle"
    $buildGradle = $buildGradle -replace 'versionName ".*"', "versionName `"$Version`""
    $buildGradle | Set-Content "android\app\build.gradle"
    
    Write-Host "✅ Version updated to $Version" -ForegroundColor Green
    Write-Host ""
}

# Run tests (optional)
if (-not $SkipTests) {
    Write-Host "🧪 Running tests..." -ForegroundColor Yellow
    try {
        & npm test -- --watchAll=false
        if ($LASTEXITCODE -ne 0) {
            Write-Host "⚠️  WARNING: Some tests failed, but continuing..." -ForegroundColor Yellow
        } else {
            Write-Host "✅ All tests passed" -ForegroundColor Green
        }
    } catch {
        Write-Host "⚠️  WARNING: Could not run tests, but continuing..." -ForegroundColor Yellow
    }
    Write-Host ""
}

# Build process
if (-not $SkipBuild) {
    Write-Host "🏗️  Building release version..." -ForegroundColor Yellow
    
    try {
        # Clean previous builds
        Write-Host "  Cleaning previous builds..." -ForegroundColor Gray
        & .\android\gradlew clean
        if ($LASTEXITCODE -ne 0) { throw "Clean failed" }
        
        # Install dependencies
        Write-Host "  Installing dependencies..." -ForegroundColor Gray
        & npm install
        if ($LASTEXITCODE -ne 0) { throw "npm install failed" }
        
        # Create keystore if not exists
        if (-not (Test-Path "android\app\release.keystore")) {
            Write-Host "  Creating release keystore..." -ForegroundColor Gray
            & keytool -genkey -v -keystore android\app\release.keystore -alias gossip-app -keyalg RSA -keysize 2048 -validity 10000 -storepass gossip123 -keypass gossip123 -dname "CN=GossipIn, OU=Development, O=GossipIn, L=City, S=State, C=US"
            if ($LASTEXITCODE -ne 0) { throw "Keystore creation failed" }
        }
        
        # Build APK
        Write-Host "  Building APK..." -ForegroundColor Gray
        Set-Location android
        & .\gradlew assembleRelease
        if ($LASTEXITCODE -ne 0) { throw "APK build failed" }
        
        # Build AAB
        Write-Host "  Building AAB..." -ForegroundColor Gray
        & .\gradlew bundleRelease
        if ($LASTEXITCODE -ne 0) { throw "AAB build failed" }
        Set-Location ..
        
        Write-Host "✅ Build completed successfully!" -ForegroundColor Green
        
    } catch {
        Write-Host "❌ Build failed: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
    Write-Host ""
}

# Display build outputs
Write-Host "📦 Build Outputs:" -ForegroundColor Cyan
Write-Host "=================" -ForegroundColor Cyan

$apkPath = "android\app\build\outputs\apk\release\app-release.apk"
$aabPath = "android\app\build\outputs\bundle\release\app-release.aab"

if (Test-Path $apkPath) {
    $apkSize = [math]::Round((Get-Item $apkPath).Length / 1MB, 2)
    Write-Host "📱 APK: $apkPath ($apkSize MB)" -ForegroundColor Green
} else {
    Write-Host "❌ APK not found" -ForegroundColor Red
}

if (Test-Path $aabPath) {
    $aabSize = [math]::Round((Get-Item $aabPath).Length / 1MB, 2)
    Write-Host "📦 AAB: $aabPath ($aabSize MB)" -ForegroundColor Green
} else {
    Write-Host "❌ AAB not found" -ForegroundColor Red
}

Write-Host ""

# Display next steps
Write-Host "🎯 Next Steps:" -ForegroundColor Cyan
Write-Host "==============" -ForegroundColor Cyan
Write-Host "1. Go to Google Play Console" -ForegroundColor White
Write-Host "2. Create new app or update existing" -ForegroundColor White
Write-Host "3. Upload the AAB file: $aabPath" -ForegroundColor White
Write-Host "4. Complete store listing information" -ForegroundColor White
Write-Host "5. Submit for review" -ForegroundColor White
Write-Host ""

# Open relevant files
Write-Host "📋 Helpful Files:" -ForegroundColor Cyan
Write-Host "=================" -ForegroundColor Cyan
Write-Host "• Deployment Guide: PLAYSTORE_DEPLOYMENT_GUIDE.md" -ForegroundColor Gray
Write-Host "• Checklist: DEPLOYMENT_CHECKLIST.md" -ForegroundColor Gray
Write-Host "• App Description: playstore-assets\app-description.txt" -ForegroundColor Gray
Write-Host "• Release Notes: playstore-assets\release-notes.txt" -ForegroundColor Gray
Write-Host ""

# Ask if user wants to open Play Console
$openConsole = Read-Host "Would you like to open Google Play Console? (y/n)"
if ($openConsole -eq "y" -or $openConsole -eq "Y") {
    Start-Process "https://play.google.com/console"
}

Write-Host ""
Write-Host "🎉 Deployment preparation complete!" -ForegroundColor Green
Write-Host "Good luck with your Play Store submission! 🚀" -ForegroundColor Green
