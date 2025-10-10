@echo off
echo ============================================
echo  GossipIn - Working Build Script
echo  Fixed Gradle configuration issues
echo ============================================
echo.

cd /d "%~dp0"

echo [1/6] Stopping Metro...
taskkill /f /im node.exe 2>nul

echo [2/6] Uninstalling old app...
adb uninstall com.gossipin 2>nul

echo [3/6] Cleaning build directories...
if exist "android\app\build" rmdir /s /q "android\app\build"
if exist "android\build" rmdir /s /q "android\build"

echo [4/6] Building debug APK (most reliable)...
cd android
echo Starting build...
call gradlew.bat assembleDebug --no-daemon --info

if errorlevel 1 (
    echo.
    echo [ERROR] Build failed. Trying release build...
    call gradlew.bat assembleRelease --no-daemon --info
    
    if errorlevel 1 (
        echo [ERROR] Both builds failed!
        echo.
        echo Please check:
        echo 1. Android SDK is installed
        echo 2. JAVA_HOME is set
        echo 3. Device is connected
        cd ..
        pause
        exit /b 1
    ) else (
        echo [SUCCESS] Release APK built!
        cd ..
        echo [5/6] Installing release APK...
        adb install -r android\app\build\outputs\apk\release\app-release.apk
    )
) else (
    echo [SUCCESS] Debug APK built!
    cd ..
    echo [5/6] Installing debug APK...
    adb install -r android\app\build\outputs\apk\debug\app-debug.apk
)

echo [6/6] Starting app...
adb shell am start -n com.gossipin/.MainActivity

echo.
echo ============================================
echo  BUILD SUCCESSFUL!
echo ============================================
echo.
echo The app should now be running on your device.
echo.
pause

