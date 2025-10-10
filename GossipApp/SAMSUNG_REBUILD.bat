@echo off
echo ============================================
echo  GossipIn - Samsung Device Rebuild Script
echo ============================================
echo.

cd /d "%~dp0"

echo [1/5] Checking environment...
if not exist "android\gradlew.bat" (
    echo ERROR: gradlew.bat not found. Are you in the GossipApp directory?
    pause
    exit /b 1
)

echo [2/5] Cleaning previous builds...
cd android
call gradlew.bat clean
if errorlevel 1 (
    echo ERROR: Clean failed!
    pause
    exit /b 1
)

echo.
echo [3/5] Building release APK with Samsung fixes...
echo This may take a few minutes...
call gradlew.bat assembleRelease
if errorlevel 1 (
    echo ERROR: Build failed!
    echo.
    echo Common fixes:
    echo 1. Run: npm install
    echo 2. Check JAVA_HOME is set
    echo 3. Check Android SDK is installed
    pause
    exit /b 1
)

cd ..

echo.
echo [4/5] Verifying APK...
if exist "android\app\build\outputs\apk\release\app-release.apk" (
    echo SUCCESS: APK built successfully!
    echo Location: %cd%\android\app\build\outputs\apk\release\app-release.apk
    
    :: Get file size
    for %%A in ("android\app\build\outputs\apk\release\app-release.apk") do (
        set size=%%~zA
        set /a sizeMB=%%~zA / 1048576
    )
    echo APK Size: !sizeMB! MB
) else (
    echo ERROR: APK not found after build!
    pause
    exit /b 1
)

echo.
echo [5/5] Ready to install on Samsung device
echo.
echo ============================================
echo  BUILD COMPLETE!
echo ============================================
echo.
echo Next steps:
echo 1. Connect your Samsung device via USB
echo 2. Enable USB debugging on device
echo 3. Run: adb devices (to verify connection)
echo 4. Run: adb install -r android\app\build\outputs\apk\release\app-release.apk
echo.
echo Or use this quick install command:
echo.
echo   adb uninstall com.gossipin ^&^& adb install android\app\build\outputs\apk\release\app-release.apk
echo.
echo ============================================
echo.

:: Ask if user wants to install now
echo Do you want to install on connected device now? (Y/N)
set /p install_now=
if /i "%install_now%"=="Y" (
    echo.
    echo Checking for connected devices...
    adb devices
    echo.
    echo Uninstalling old version...
    adb uninstall com.gossipin
    echo.
    echo Installing new version...
    adb install android\app\build\outputs\apk\release\app-release.apk
    if errorlevel 1 (
        echo Installation failed! Check USB debugging is enabled.
    ) else (
        echo.
        echo SUCCESS! App installed on device.
        echo.
        echo Starting app...
        adb shell am start -n com.gossipin/.MainActivity
        echo.
        echo View logs with: adb logcat | findstr "GossipIn"
    )
)

echo.
pause


