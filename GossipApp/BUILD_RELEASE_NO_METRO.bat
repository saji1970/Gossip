@echo off
echo ============================================
echo  GossipIn - Release Build (No Metro Needed)
echo  Version 1.0.1 - Samsung Fixes Included
echo ============================================
echo.

cd /d "%~dp0"

echo [INFO] Building standalone release APK...
echo [INFO] This version includes all Samsung compatibility fixes
echo [INFO] No Metro server needed - works completely offline
echo.

:: Check if we're in the right directory
if not exist "android\gradlew.bat" (
    echo [ERROR] gradlew.bat not found. Are you in the GossipApp directory?
    pause
    exit /b 1
)

echo ============================================
echo  STEP 1: Building Release APK
echo ============================================
cd android
echo Building APK (this may take 5-10 minutes)...
echo.

call gradlew.bat assembleRelease --no-daemon
if errorlevel 1 (
    echo [ERROR] Build failed!
    echo.
    echo Common fixes:
    echo 1. Check JAVA_HOME is set
    echo 2. Check Android SDK is installed
    echo 3. Verify release keystore exists
    cd ..
    pause
    exit /b 1
)

echo [SUCCESS] APK built successfully!
cd ..

echo.
echo ============================================
echo  STEP 2: Verifying APK
echo ============================================

set APK_PATH=android\app\build\outputs\apk\release\app-release.apk

if exist "%APK_PATH%" (
    echo [OK] Release APK found: %APK_PATH%
    for %%A in ("%APK_PATH%") do (
        set /a sizeMB=%%~zA / 1048576
        echo     Size: !sizeMB! MB
    )
    echo.
    echo ============================================
    echo  STEP 3: Installing on Device
    echo ============================================
    echo.
    echo Installing APK on connected device...
    adb install -r "%APK_PATH%"
    if errorlevel 1 (
        echo [WARNING] Installation failed. Device may not be connected.
        echo.
        echo Manual installation:
        echo 1. Copy APK to your device
        echo 2. Enable "Install from unknown sources"
        echo 3. Tap APK to install
    ) else (
        echo [SUCCESS] App installed successfully!
        echo.
        echo Starting app...
        adb shell am start -n com.gossipin/.MainActivity
        echo.
        echo ============================================
        echo  SUCCESS! App is now running!
        echo ============================================
        echo.
        echo This release version includes:
        echo - All Samsung compatibility fixes
        echo - No Metro connection required
        echo - Works completely offline
        echo - Optimized for production
    )
) else (
    echo [ERROR] APK not found after build!
    echo Expected location: %APK_PATH%
    pause
    exit /b 1
)

echo.
echo ============================================
echo  BUILD COMPLETE!
echo ============================================
echo.
echo Release APK location:
echo %cd%\%APK_PATH%
echo.
echo Version: 1.0.1 (Build 2)
echo What's New: Samsung device compatibility fixes
echo.
echo Features included:
echo - Fixed crashes on Samsung devices
echo - Fixed touch events
echo - Fixed Firebase connectivity
echo - Fixed battery optimization issues
echo - MultiDex enabled
echo - Hardware acceleration
echo - No Metro dependency
echo.
echo ============================================
echo.

pause

