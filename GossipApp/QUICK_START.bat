@echo off
color 0A
title GossipIn - Quick Start Setup

echo.
echo ========================================
echo    ___                 _       ___      
echo   / __^|___ ___ ___ (_)_ __ ^|_ _^|_ _  
echo  ^| (__/ _ (_-^<_-^</ / ' \  ^| ^| ' \ 
echo   \___\___/__/__/_/_^|_^|_^| ^|___^|_^|_^|_^|
echo.
echo   Ephemeral Gossip Network
echo   Zero PII ^| Anonymous ^| Ephemeral
echo ========================================
echo.

echo Welcome to GossipIn Quick Start!
echo.
echo This script will guide you through setting up your app.
echo Please have your Firebase Console open: https://console.firebase.google.com/
echo.
pause

:menu
cls
echo.
echo ========================================
echo   GossipIn Setup Menu
echo ========================================
echo.
echo What would you like to do?
echo.
echo [1] Setup google-services.json
echo [2] Deploy Firebase Backend
echo [3] Test Development Build
echo [4] Build Production APK
echo [5] View Production Checklist
echo [6] Exit
echo.
set /p choice="Enter your choice (1-6): "

if "%choice%"=="1" goto setup_google
if "%choice%"=="2" goto deploy_firebase
if "%choice%"=="3" goto test_dev
if "%choice%"=="4" goto build_prod
if "%choice%"=="5" goto view_checklist
if "%choice%"=="6" goto end
goto menu

:setup_google
echo.
echo ========================================
echo   Step 1: Setup Google Services
echo ========================================
echo.
call setup-google-services.bat
pause
goto menu

:deploy_firebase
echo.
echo ========================================
echo   Step 2: Deploy Firebase Backend
echo ========================================
echo.
echo IMPORTANT: Make sure you have:
echo 1. Created Firebase project named "GossipIn"
echo 2. Enabled Anonymous Authentication
echo 3. Created Firestore Database
echo.
set /p confirm="Have you completed Firebase setup? (Y/N): "
if /i not "%confirm%"=="Y" (
    echo.
    echo Please complete Firebase setup first:
    echo https://console.firebase.google.com/
    pause
    goto menu
)
call deploy-firebase.bat
pause
goto menu

:test_dev
echo.
echo ========================================
echo   Step 3: Test Development Build
echo ========================================
echo.
echo Starting Metro bundler...
start "Metro Bundler" cmd /c "cd %~dp0 && npx react-native start"
timeout /t 5
echo.
echo Installing app on emulator...
npx react-native run-android
pause
goto menu

:build_prod
echo.
echo ========================================
echo   Step 4: Build Production APK
echo ========================================
echo.
call build-production.bat
pause
goto menu

:view_checklist
echo.
echo Opening production checklist...
start notepad PRODUCTION_CHECKLIST.md
pause
goto menu

:end
echo.
echo ========================================
echo   Thanks for using GossipIn Setup!
echo ========================================
echo.
echo Your app is ready for deployment!
echo.
echo Next steps:
echo - Test the app thoroughly
echo - Read PRODUCTION_CHECKLIST.md
echo - Deploy to Play Store (optional)
echo.
pause
exit

