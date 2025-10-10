# GossipIn Play Store Build Script
# PowerShell version for better compatibility

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "    GossipIn Play Store Build Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "ERROR: Please run this script from the GossipApp directory" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

try {
    Write-Host "[1/6] Cleaning previous builds..." -ForegroundColor Yellow
    & .\android\gradlew clean
    if ($LASTEXITCODE -ne 0) { throw "Clean failed" }

    Write-Host ""
    Write-Host "[2/6] Installing dependencies..." -ForegroundColor Yellow
    & npm install
    if ($LASTEXITCODE -ne 0) { throw "npm install failed" }

    Write-Host ""
    Write-Host "[3/6] Creating release keystore (if not exists)..." -ForegroundColor Yellow
    if (-not (Test-Path "android\app\release.keystore")) {
        Write-Host "Creating release keystore..." -ForegroundColor Green
        & keytool -genkey -v -keystore android\app\release.keystore -alias gossip-app -keyalg RSA -keysize 2048 -validity 10000 -storepass gossip123 -keypass gossip123 -dname "CN=GossipIn, OU=Development, O=GossipIn, L=City, S=State, C=US"
        if ($LASTEXITCODE -ne 0) { throw "Keystore creation failed" }
    } else {
        Write-Host "Release keystore already exists" -ForegroundColor Green
    }

    Write-Host ""
    Write-Host "[4/6] Building release APK..." -ForegroundColor Yellow
    Set-Location android
    & .\gradlew assembleRelease
    if ($LASTEXITCODE -ne 0) { throw "APK build failed" }
    Set-Location ..

    Write-Host ""
    Write-Host "[5/6] Building Android App Bundle (AAB)..." -ForegroundColor Yellow
    Set-Location android
    & .\gradlew bundleRelease
    if ($LASTEXITCODE -ne 0) { throw "AAB build failed" }
    Set-Location ..

    Write-Host ""
    Write-Host "[6/6] Build completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "           BUILD OUTPUTS" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""

    $apkPath = "android\app\build\outputs\apk\release\app-release.apk"
    $aabPath = "android\app\build\outputs\bundle\release\app-release.aab"

    Write-Host "APK Location:" -ForegroundColor White
    Write-Host "  $apkPath" -ForegroundColor Gray
    Write-Host ""
    Write-Host "AAB Location (Recommended for Play Store):" -ForegroundColor White
    Write-Host "  $aabPath" -ForegroundColor Gray
    Write-Host ""

    Write-Host "File sizes:" -ForegroundColor White
    if (Test-Path $apkPath) {
        $apkSize = (Get-Item $apkPath).Length
        Write-Host "  APK: $apkSize bytes" -ForegroundColor Gray
    }
    if (Test-Path $aabPath) {
        $aabSize = (Get-Item $aabPath).Length
        Write-Host "  AAB: $aabSize bytes" -ForegroundColor Gray
    }

    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "    READY FOR PLAY STORE UPLOAD!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor White
    Write-Host "1. Go to Google Play Console" -ForegroundColor Gray
    Write-Host "2. Create new app or update existing" -ForegroundColor Gray
    Write-Host "3. Upload the AAB file" -ForegroundColor Gray
    Write-Host "4. Complete store listing" -ForegroundColor Gray
    Write-Host "5. Submit for review" -ForegroundColor Gray
    Write-Host ""

} catch {
    Write-Host ""
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Build failed. Please check the error above." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Read-Host "Press Enter to exit"
