@echo off
echo Building GossipIn Standalone Release...
echo.

cd /d "%~dp0"

echo Step 1: Building release APK...
cd android
call gradlew.bat assembleRelease

if errorlevel 1 (
    echo Build failed!
    pause
    exit /b 1
)

echo.
echo Step 2: Installing on device...
cd ..
adb install -r android\app\build\outputs\apk\release\app-release.apk

echo.
echo Done! App installed without Metro dependency.
echo.
pause
