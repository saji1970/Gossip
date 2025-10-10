@echo off
echo ============================================
echo  GossipIn - Quick Install to Android Device
echo ============================================
echo.

cd /d "%~dp0"

echo [1/3] Checking for connected devices...
adb devices
echo.

echo [2/3] Building and installing app...
echo This will take a few minutes...
echo.
npx react-native run-android

echo.
echo ============================================
echo Installation process started!
echo ============================================
echo.
echo The app should install and launch automatically.
echo.
echo To view logs:
echo   adb logcat | findstr "GossipIn ReactNative"
echo.
pause

