@echo off
echo ========================================
echo   GossipIn - Google Services Setup
echo ========================================
echo.
echo This script will help you place google-services.json
echo.
echo Instructions:
echo 1. Download google-services.json from Firebase Console
echo 2. Place it in your Downloads folder
echo 3. This script will copy it to the correct location
echo.
pause

set "SOURCE=%USERPROFILE%\Downloads\google-services.json"
set "DEST=%~dp0android\app\google-services.json"

if not exist "%SOURCE%" (
    echo.
    echo [ERROR] google-services.json not found in Downloads folder!
    echo.
    echo Please:
    echo 1. Go to Firebase Console: https://console.firebase.google.com/
    echo 2. Select your GossipIn project
    echo 3. Click Project Settings ^(gear icon^)
    echo 4. Under "Your apps" click on the Android app
    echo 5. Click "google-services.json" to download
    echo 6. Make sure it's in your Downloads folder
    echo 7. Run this script again
    echo.
    pause
    exit /b 1
)

echo.
echo Found google-services.json in Downloads!
echo Copying to: %DEST%
copy /Y "%SOURCE%" "%DEST%"

if errorlevel 1 (
    echo.
    echo [ERROR] Failed to copy file!
    pause
    exit /b 1
)

echo.
echo ========================================
echo   SUCCESS! ✓
echo ========================================
echo.
echo google-services.json has been placed in:
echo %DEST%
echo.
echo You can now build and run the app:
echo   npx react-native run-android
echo.
pause

