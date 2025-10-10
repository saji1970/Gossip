@echo off
echo ========================================
echo   Upload Privacy Policy to GitHub
echo   Username: saji1970
echo ========================================
echo.
echo STEP 1: Open GitHub Gist
echo -----------------------
echo Opening GitHub Gist in your browser...
start https://gist.github.com
echo.
echo STEP 2: Copy Privacy Policy
echo -----------------------
echo Opening privacy-policy.html in notepad...
start notepad "%~dp0privacy-policy.html"
echo.
echo ========================================
echo   FOLLOW THESE STEPS:
echo ========================================
echo.
echo 1. In the browser (GitHub Gist):
echo    - Login as: saji1970
echo    - Click: "+ Create new gist" (green button)
echo.
echo 2. In the notepad window:
echo    - Press: Ctrl+A (select all)
echo    - Press: Ctrl+C (copy)
echo.
echo 3. Back to GitHub Gist:
echo    - Filename: privacy-policy.html
echo    - Paste the copied content (Ctrl+V)
echo    - Description: "GossipIn Privacy Policy"
echo    - Click: "Create public gist" (bottom right)
echo.
echo 4. Get your URL:
echo    - Click: "Raw" button (top right)
echo    - Copy the URL from address bar
echo.
echo Your URL will look like:
echo https://gist.githubusercontent.com/saji1970/XXXXX/raw/privacy-policy.html
echo.
echo ========================================
echo Then add this URL to Play Console!
echo ========================================
echo.
pause

