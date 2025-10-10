@echo off
echo ============================================
echo  GossipIn - Play Store Release Builder
echo  Version 1.0.1 (Build 2) - Samsung Fix
echo ============================================
echo.

cd /d "%~dp0"

echo [INFO] Building release for Google Play Store...
echo [INFO] This includes all Samsung compatibility fixes
echo.

:: Check if we're in the right directory
if not exist "android\gradlew.bat" (
    echo [ERROR] gradlew.bat not found. Are you in the GossipApp directory?
    pause
    exit /b 1
)

:: Check if release keystore exists
if not exist "android\app\release.keystore" (
    echo [WARNING] release.keystore not found at android\app\release.keystore
    echo [INFO] The build will fail without a valid keystore
    echo.
    pause
)

echo ============================================
echo  STEP 1: Cleaning Previous Builds
echo ============================================
cd android
echo Cleaning...
call gradlew.bat clean
if errorlevel 1 (
    echo [ERROR] Clean failed!
    cd ..
    pause
    exit /b 1
)
echo [OK] Clean completed
echo.

echo ============================================
echo  STEP 2: Building Release APK
echo ============================================
echo Building APK for testing...
call gradlew.bat assembleRelease
if errorlevel 1 (
    echo [ERROR] APK build failed!
    echo.
    echo Common fixes:
    echo 1. Verify release.keystore exists
    echo 2. Check keystore password in build.gradle
    echo 3. Run: npm install in project root
    cd ..
    pause
    exit /b 1
)
echo [OK] APK built successfully
echo.

echo ============================================
echo  STEP 3: Building Release Bundle (AAB)
echo ============================================
echo Building AAB for Play Store upload...
call gradlew.bat bundleRelease
if errorlevel 1 (
    echo [ERROR] Bundle build failed!
    cd ..
    pause
    exit /b 1
)
echo [OK] AAB built successfully
echo.

cd ..

echo ============================================
echo  STEP 4: Verifying Build Artifacts
echo ============================================
echo.

set APK_PATH=android\app\build\outputs\apk\release\app-release.apk
set AAB_PATH=android\app\build\outputs\bundle\release\app-release.aab

if exist "%APK_PATH%" (
    echo [OK] APK found: %APK_PATH%
    for %%A in ("%APK_PATH%") do (
        set /a sizeMB=%%~zA / 1048576
        echo     Size: !sizeMB! MB
    )
) else (
    echo [ERROR] APK not found!
)

echo.

if exist "%AAB_PATH%" (
    echo [OK] AAB found: %AAB_PATH%
    for %%B in ("%AAB_PATH%") do (
        set /a sizeMB=%%~zB / 1048576
        echo     Size: !sizeMB! MB
    )
) else (
    echo [ERROR] AAB not found!
)

echo.
echo ============================================
echo  BUILD COMPLETE!
echo ============================================
echo.
echo Version: 1.0.1 (Build 2)
echo What's New: Samsung device compatibility fixes
echo.
echo Files ready for distribution:
echo.
echo 1. PLAY STORE UPLOAD (REQUIRED):
echo    %cd%\%AAB_PATH%
echo.
echo 2. DIRECT INSTALL / TESTING:
echo    %cd%\%APK_PATH%
echo.
echo ============================================
echo  NEXT STEPS
echo ============================================
echo.
echo FOR PLAY STORE:
echo   1. Go to: https://play.google.com/console
echo   2. Select "GossipIn" app
echo   3. Go to "Production" or "Internal testing"
echo   4. Click "Create new release"
echo   5. Upload: %AAB_PATH%
echo   6. Add release notes:
echo      "Bug fixes for Samsung devices"
echo   7. Review and roll out
echo.
echo FOR TESTING ON DEVICE:
echo   adb install -r %APK_PATH%
echo.
echo ============================================
echo.

:: Create a release notes file
echo Creating release notes...
(
echo GossipIn v1.0.1 ^(Build 2^) - Release Notes
echo ==========================================
echo.
echo What's New:
echo -----------
echo - Fixed: App crashes on Samsung devices
echo - Fixed: Touch events not working on Samsung phones
echo - Fixed: Firebase connection issues
echo - Fixed: Battery optimization problems
echo - Fixed: Image upload functionality
echo - Improved: Overall stability and performance
echo - Added: MultiDex support for better compatibility
echo - Added: Proper permissions for Android 13+
echo.
echo Technical Changes:
echo ------------------
echo - Updated ProGuard rules for React Native
echo - Enhanced Android Manifest permissions
echo - Enabled hardware acceleration
echo - Added Samsung-specific optimizations
echo - Fixed method limit exceeded errors
echo.
echo Build Info:
echo -----------
echo Version Code: 2
echo Version Name: 1.0.1
echo Min SDK: 24 ^(Android 7.0^)
echo Target SDK: 36 ^(Android 14+^)
echo Build Date: %date% %time%
echo.
) > RELEASE_NOTES_v1.0.1.txt

echo [OK] Release notes saved to: RELEASE_NOTES_v1.0.1.txt
echo.

pause

