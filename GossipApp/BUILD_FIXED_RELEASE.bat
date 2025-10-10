@echo off
echo ============================================
echo  GossipIn - Fixed Release Build
echo  Fixes TurboModule PlatformConstants Error
echo ============================================
echo.

cd /d "%~dp0"

echo [1/4] Cleaning previous builds...
cd android
call gradlew.bat clean
cd ..

echo [2/4] Clearing Metro cache...
npx react-native start --reset-cache &
timeout /t 3 /nobreak > nul
taskkill /f /im node.exe 2>nul

echo [3/4] Building fixed release APK...
cd android
call gradlew.bat assembleRelease --no-daemon
if errorlevel 1 (
    echo [ERROR] Build failed!
    cd ..
    pause
    exit /b 1
)
cd ..

echo [4/4] Installing fixed APK...
adb install -r android\app\build\outputs\apk\release\app-release.apk

echo.
echo ============================================
echo  FIXED BUILD COMPLETE!
echo ============================================
echo.
echo Changes made:
echo - Disabled TurboModule/New Architecture
echo - Fixed PlatformConstants error
echo - Updated ProGuard rules
echo - All Samsung fixes included
echo.
echo The app should now work without TurboModule errors!
echo.
pause
