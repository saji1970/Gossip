@echo off
echo ========================================
echo   GossipIn - Play Store AAB Builder
echo   Version 1.1.0
echo ========================================
echo.

echo [1/4] Generating JavaScript bundle...
cd C:\Gossip\GossipApp
call npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res
if %errorlevel% neq 0 (
    echo ERROR: Bundle generation failed!
    pause
    exit /b 1
)
echo ✓ Bundle generated successfully
echo.

echo [2/4] Cleaning previous build...
cd android
call gradlew clean
echo ✓ Clean complete
echo.

echo [3/4] Building Android App Bundle (AAB)...
call gradlew bundleRelease
if %errorlevel% neq 0 (
    echo ERROR: AAB build failed!
    pause
    exit /b 1
)
echo ✓ AAB built successfully
echo.

echo [4/4] Build Summary...
echo.
echo ========================================
echo   BUILD SUCCESSFUL!
echo ========================================
echo.
echo File: app-release.aab
echo Location: android\app\build\outputs\bundle\release\
echo Version: 1.1.0 (Build 3)
echo Size: ~20 MB
echo.
echo File ready for Play Store upload!
echo.
dir android\app\build\outputs\bundle\release\app-release.aab
echo.
echo ========================================
echo   NEXT STEPS:
echo ========================================
echo 1. Go to https://play.google.com/console
echo 2. Select your app
echo 3. Testing -^> Internal testing
echo 4. Create release
echo 5. Upload: app-release.aab
echo 6. Add release notes
echo 7. Start rollout
echo.
echo Keystore Password: gossip123
echo Key Alias: gossip-app
echo.
pause

