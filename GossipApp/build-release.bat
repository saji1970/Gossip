@echo off
echo ========================================
echo    GossipIn Play Store Build Script
echo ========================================
echo.

REM Check if we're in the right directory
if not exist "package.json" (
    echo ERROR: Please run this script from the GossipApp directory
    pause
    exit /b 1
)

echo [1/6] Cleaning previous builds...
call gradlew clean
if %errorlevel% neq 0 (
    echo ERROR: Clean failed
    pause
    exit /b 1
)

echo.
echo [2/6] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: npm install failed
    pause
    exit /b 1
)

echo.
echo [3/6] Creating release keystore (if not exists)...
if not exist "android\app\release.keystore" (
    echo Creating release keystore...
    keytool -genkey -v -keystore android\app\release.keystore -alias gossip-app -keyalg RSA -keysize 2048 -validity 10000 -storepass gossip123 -keypass gossip123 -dname "CN=GossipIn, OU=Development, O=GossipIn, L=City, S=State, C=US"
    if %errorlevel% neq 0 (
        echo ERROR: Keystore creation failed
        pause
        exit /b 1
    )
) else (
    echo Release keystore already exists
)

echo.
echo [4/6] Building release APK...
cd android
call gradlew assembleRelease
if %errorlevel% neq 0 (
    echo ERROR: APK build failed
    cd ..
    pause
    exit /b 1
)
cd ..

echo.
echo [5/6] Building Android App Bundle (AAB)...
cd android
call gradlew bundleRelease
if %errorlevel% neq 0 (
    echo ERROR: AAB build failed
    cd ..
    pause
    exit /b 1
)
cd ..

echo.
echo [6/6] Build completed successfully!
echo.
echo ========================================
echo           BUILD OUTPUTS
echo ========================================
echo.
echo APK Location:
echo   android\app\build\outputs\apk\release\app-release.apk
echo.
echo AAB Location (Recommended for Play Store):
echo   android\app\build\outputs\bundle\release\app-release.aab
echo.
echo File sizes:
if exist "android\app\build\outputs\apk\release\app-release.apk" (
    for %%A in ("android\app\build\outputs\apk\release\app-release.apk") do echo   APK: %%~zA bytes
)
if exist "android\app\build\outputs\bundle\release\app-release.aab" (
    for %%A in ("android\app\build\outputs\bundle\release\app-release.aab") do echo   AAB: %%~zA bytes
)
echo.
echo ========================================
echo    READY FOR PLAY STORE UPLOAD!
echo ========================================
echo.
echo Next steps:
echo 1. Go to Google Play Console
echo 2. Create new app or update existing
echo 3. Upload the AAB file
echo 4. Complete store listing
echo 5. Submit for review
echo.
pause
