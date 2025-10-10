@echo off
echo ========================================
echo   GossipIn - Production Build
echo ========================================
echo.

REM Check if google-services.json exists
if not exist "android\app\google-services.json" (
    echo [ERROR] google-services.json not found!
    echo Please run setup-google-services.bat first
    pause
    exit /b 1
)

echo [1/4] Cleaning previous builds...
cd android
call gradlew clean
cd ..

echo.
echo [2/4] Building JavaScript bundle...
npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res

echo.
echo [3/4] Building Release APK...
cd android
call gradlew assembleRelease
cd ..

if errorlevel 1 (
    echo.
    echo [ERROR] Build failed!
    pause
    exit /b 1
)

echo.
echo [4/4] Locating APK...
set "APK_PATH=android\app\build\outputs\apk\release\app-release.apk"

if exist "%APK_PATH%" (
    echo.
    echo ========================================
    echo   BUILD SUCCESS! ✓
    echo ========================================
    echo.
    echo Production APK Location:
    echo %APK_PATH%
    echo.
    echo APK Size:
    for %%I in ("%APK_PATH%") do echo %%~zI bytes
    echo.
    echo You can now:
    echo 1. Install on device: adb install "%APK_PATH%"
    echo 2. Upload to Play Store
    echo 3. Share with testers
    echo.
) else (
    echo [ERROR] APK not found at expected location!
)

pause

