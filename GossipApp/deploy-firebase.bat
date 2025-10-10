@echo off
echo ========================================
echo   GossipIn Firebase Deployment Script
echo ========================================
echo.

REM Check if Firebase CLI is installed
firebase --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Firebase CLI not found!
    echo Installing Firebase CLI...
    npm install -g firebase-tools
    if errorlevel 1 (
        echo [ERROR] Failed to install Firebase CLI
        pause
        exit /b 1
    )
)

echo [1/5] Checking Firebase login...
firebase login:list
if errorlevel 1 (
    echo Please login to Firebase...
    firebase login
)

echo.
echo [2/5] Building Cloud Functions...
cd functions
call npm install
if errorlevel 1 (
    echo [ERROR] Failed to install function dependencies
    cd ..
    pause
    exit /b 1
)

call npm run build
if errorlevel 1 (
    echo [ERROR] Failed to build functions
    cd ..
    pause
    exit /b 1
)
cd ..

echo.
echo [3/5] Deploying Firestore Security Rules...
firebase deploy --only firestore:rules
if errorlevel 1 (
    echo [WARNING] Failed to deploy rules
)

echo.
echo [4/5] Deploying Firestore Indexes...
firebase deploy --only firestore:indexes
if errorlevel 1 (
    echo [WARNING] Failed to deploy indexes
)

echo.
echo [5/5] Deploying Cloud Functions...
firebase deploy --only functions
if errorlevel 1 (
    echo [ERROR] Failed to deploy functions
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Deployment Complete! ✓
echo ========================================
echo.
echo Your GossipIn backend is now live!
echo.
echo Next steps:
echo 1. Place google-services.json in android/app/
echo 2. Run: npx react-native run-android
echo.
pause

