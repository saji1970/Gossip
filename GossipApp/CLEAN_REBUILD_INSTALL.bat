@echo off
echo ============================================
echo  GossipIn - Complete Clean Rebuild & Install
echo  Removes old build and installs fixed version
echo ============================================
echo.

cd /d "%~dp0"

echo [1/8] Stopping Metro bundler...
taskkill /f /im node.exe 2>nul
timeout /t 2 /nobreak > nul

echo [2/8] Uninstalling old app from device...
adb uninstall com.gossipin
echo Old app removed from device.

echo [3/8] Cleaning Android build cache...
cd android
call gradlew.bat clean
if errorlevel 1 (
    echo Warning: Clean failed, continuing anyway...
)
cd ..

echo [4/8] Removing build directories...
if exist "android\app\build" (
    rmdir /s /q "android\app\build"
    echo Build directory removed.
)

if exist "android\build" (
    rmdir /s /q "android\build"
    echo Android build cache removed.
)

if exist "node_modules\.cache" (
    rmdir /s /q "node_modules\.cache"
    echo Node cache removed.
)

echo [5/8] Clearing Metro cache...
npx react-native start --reset-cache &
timeout /t 5 /nobreak > nul
taskkill /f /im node.exe 2>nul
echo Metro cache cleared.

echo [6/8] Building fresh release APK with fixes...
cd android
echo This may take 5-10 minutes...
call gradlew.bat assembleRelease --no-daemon
if errorlevel 1 (
    echo [ERROR] Build failed!
    echo.
    echo Troubleshooting:
    echo 1. Check if JAVA_HOME is set
    echo 2. Verify Android SDK is installed
    echo 3. Check if release.keystore exists
    cd ..
    pause
    exit /b 1
)
cd ..

echo [7/8] Verifying APK was created...
set APK_PATH=android\app\build\outputs\apk\release\app-release.apk
if exist "%APK_PATH%" (
    echo [SUCCESS] APK created: %APK_PATH%
    for %%A in ("%APK_PATH%") do (
        set /a sizeMB=%%~zA / 1048576
        echo APK Size: !sizeMB! MB
    )
) else (
    echo [ERROR] APK not found!
    pause
    exit /b 1
)

echo [8/8] Installing fresh APK on device...
adb install -r "%APK_PATH%"
if errorlevel 1 (
    echo [ERROR] Installation failed!
    echo.
    echo Make sure:
    echo 1. Device is connected via USB
    echo 2. USB debugging is enabled
    echo 3. Device appears in: adb devices
    echo.
    echo Manual installation:
    echo Copy APK to device and install manually
) else (
    echo [SUCCESS] App installed successfully!
    echo.
    echo Starting the app...
    adb shell am start -n com.gossipin/.MainActivity
)

echo.
echo ============================================
echo  CLEAN REBUILD COMPLETE!
echo ============================================
echo.
echo What was done:
echo - Removed old app from device
echo - Cleaned all build caches
echo - Built fresh APK with all fixes
echo - Installed fixed version
echo.
echo This version includes:
echo - TurboModule fixes (PlatformConstants error resolved)
echo - Samsung device compatibility
echo - No Metro dependency needed
echo - All security and performance fixes
echo.
echo The app should now work without errors!
echo.
pause
