@echo off
echo ============================================
echo  GossipIn - Simple Build Fix
echo  Resolves build failures step by step
echo ============================================
echo.

cd /d "%~dp0"

echo [STEP 1] Stopping Metro bundler...
taskkill /f /im node.exe 2>nul
timeout /t 2 /nobreak > nul

echo [STEP 2] Removing old app from device...
adb uninstall com.gossipin 2>nul

echo [STEP 3] Cleaning project...
if exist "android\app\build" rmdir /s /q "android\app\build"
if exist "android\build" rmdir /s /q "android\build"

echo [STEP 4] Building APK with minimal configuration...
cd android

echo Starting Gradle build...
call gradlew.bat assembleRelease --no-daemon --stacktrace

if errorlevel 1 (
    echo.
    echo [ERROR] Build failed! Trying alternative approach...
    echo.
    echo [STEP 5] Building debug version instead...
    call gradlew.bat assembleDebug --no-daemon
    
    if errorlevel 1 (
        echo [ERROR] Debug build also failed!
        echo.
        echo Common fixes:
        echo 1. Check JAVA_HOME is set
        echo 2. Check Android SDK is installed
        echo 3. Verify release.keystore exists
        echo.
        cd ..
        pause
        exit /b 1
    ) else (
        echo [SUCCESS] Debug APK built successfully!
        echo Installing debug version...
        cd ..
        adb install -r android\app\build\outputs\apk\debug\app-debug.apk
    )
) else (
    echo [SUCCESS] Release APK built successfully!
    echo Installing release version...
    cd ..
    adb install -r android\app\build\outputs\apk\release\app-release.apk
)

echo.
echo [STEP 6] Starting app...
adb shell am start -n com.gossipin/.MainActivity

echo.
echo ============================================
echo  BUILD COMPLETE!
echo ============================================
echo.
echo The app should now be running on your device.
echo.
pause

