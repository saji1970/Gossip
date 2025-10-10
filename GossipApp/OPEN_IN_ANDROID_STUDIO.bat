@echo off
echo ============================================
echo   GossipIn - Open in Android Studio
echo ============================================
echo.

echo [1/3] Checking Android Studio installation...
if exist "C:\Program Files\Android\Android Studio\bin\studio64.exe" (
    echo ✅ Android Studio found at: C:\Program Files\Android\Android Studio
    set "STUDIO_PATH=C:\Program Files\Android\Android Studio\bin\studio64.exe"
) else if exist "C:\Users\%USERNAME%\AppData\Local\Android\Sdk\Android Studio\bin\studio64.exe" (
    echo ✅ Android Studio found at: C:\Users\%USERNAME%\AppData\Local\Android\Sdk\Android Studio
    set "STUDIO_PATH=C:\Users\%USERNAME%\AppData\Local\Android\Sdk\Android Studio\bin\studio64.exe"
) else (
    echo ❌ Android Studio not found in common locations
    echo Please install Android Studio or update the path in this script
    pause
    exit /b 1
)

echo.
echo [2/3] Opening Android Studio with GossipIn project...
echo Project path: %CD%\android
echo.

"%STUDIO_PATH%" "%CD%\android"

echo.
echo [3/3] Android Studio should now be opening...
echo.
echo 📱 Next steps in Android Studio:
echo    1. Wait for Gradle sync to complete
echo    2. Select your device from the dropdown
echo    3. Click the green Play button (▶️) to run
echo.
echo 🔧 If you need help:
echo    - Check ANDROID_STUDIO_INSTALL_GUIDE.md
echo    - Make sure Metro is running: npm start
echo.
pause
