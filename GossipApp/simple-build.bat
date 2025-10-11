@echo off
echo ========================================
echo    GossipIn Simple Build Script
echo ========================================
echo.

echo [1/4] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: npm install failed
    pause
    exit /b 1
)

echo.
echo [2/4] Creating release keystore (if not exists)...
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
echo [3/4] Building release APK...
cd android
call gradlew assembleRelease
if %errorlevel% neq 0 (
    echo ERROR: APK build failed
    cd ..
    pause
    exit /b 1
)

echo.
echo [4/4] Building Android App Bundle (AAB)...
call gradlew bundleRelease
if %errorlevel% neq 0 (
    echo ERROR: AAB build failed
    cd ..
    pause
    exit /b 1
)
cd ..

echo.
echo ========================================
echo           BUILD COMPLETED!
echo ========================================
echo.
echo APK Location:
echo   android\app\build\outputs\apk\release\app-release.apk
echo.
echo AAB Location (Recommended for Play Store):
echo   android\app\build\outputs\bundle\release\app-release.aab
echo.
echo ========================================
echo    READY FOR PLAY STORE UPLOAD!
echo ========================================
echo.
pause






