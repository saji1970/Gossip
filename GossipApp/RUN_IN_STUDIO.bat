@echo off
echo ========================================
echo GossipIn - Android Studio Setup
echo ========================================
echo.

echo Step 1: Checking Node modules...
if not exist node_modules (
    echo Installing dependencies...
    call npm install
) else (
    echo ✓ Node modules found
)
echo.

echo Step 2: Checking Firebase config...
if exist android\app\google-services.json (
    echo ✓ Firebase config found
) else (
    echo ✗ Firebase config missing!
    echo Please copy google-services.json to android\app\
    pause
    exit /b 1
)
echo.

echo ========================================
echo INSTRUCTIONS TO RUN IN ANDROID STUDIO
echo ========================================
echo.
echo 1. Open Android Studio
echo 2. Click "Open an Existing Project"
echo 3. Navigate to: %CD%\android
echo 4. Click OK and wait for Gradle sync
echo.
echo 5. OPTION A: Use Android Studio
echo    - Click Run button (green play icon)
echo    - Select your emulator or device
echo.
echo 6. OPTION B: Use Terminal (Recommended)
echo    - Open Terminal in Android Studio
echo    - Run: npx react-native start
echo    - Open another terminal
echo    - Run: npx react-native run-android
echo.
echo ========================================
echo.

echo Do you want to start Metro Bundler now? (Y/N)
set /p START_METRO=
if /i "%START_METRO%"=="Y" (
    echo.
    echo Starting Metro Bundler...
    echo In another terminal, run: npx react-native run-android
    echo.
    npx react-native start
) else (
    echo.
    echo Manual steps:
    echo 1. npx react-native start
    echo 2. npx react-native run-android
    echo.
    pause
)

