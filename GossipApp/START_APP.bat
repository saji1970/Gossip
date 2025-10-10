@echo off
title GossipIn - Starting App
color 0A

echo.
echo ╔════════════════════════════════════════╗
echo ║     GossipIn - Starting Application    ║
echo ╚════════════════════════════════════════╝
echo.

cd /d "%~dp0"

echo [1/3] Checking environment...
if not exist node_modules (
    echo Installing dependencies...
    call npm install
)
echo ✓ Environment ready
echo.

echo [2/3] Starting Metro Bundler...
echo ✓ Metro will start in a new window
echo.
start "Metro Bundler" cmd /k "npx react-native start"

timeout /t 5 /nobreak > nul

echo [3/3] Instructions:
echo.
echo ┌─────────────────────────────────────────┐
echo │ Metro Bundler is running!               │
echo │                                         │
echo │ Now run ONE of these options:           │
echo ├─────────────────────────────────────────┤
echo │ OPTION 1: Run from Command Line        │
echo │   Open new cmd window and run:         │
echo │   cd C:\Gossip\GossipApp               │
echo │   npx react-native run-android          │
echo │                                         │
echo │ OPTION 2: Use Android Studio           │
echo │   1. Open Android Studio                │
echo │   2. Open: C:\Gossip\GossipApp\android │
echo │   3. Click Run button (green play)      │
echo └─────────────────────────────────────────┘
echo.

pause

