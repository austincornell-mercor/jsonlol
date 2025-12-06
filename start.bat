@echo off
REM jsonlol - Local Server Launcher (Windows)
REM This script starts a local server to run the built app

echo.
echo  🚀 Starting jsonlol...
echo.

REM Check if we're in the dist folder or project root
if exist "index.html" if exist "assets" (
    set DIR=.
    goto :found
)
if exist "dist" (
    set DIR=dist
    goto :found
)

echo  ❌ Error: Could not find built app.
echo     Please run 'npm run build' first, or ensure you're in the correct directory.
pause
exit /b 1

:found
set PORT=3000

echo  📂 Serving from: %DIR%
echo  🌐 Opening http://localhost:%PORT%
echo.
echo  Press Ctrl+C to stop the server
echo.

REM Open browser
start http://localhost:%PORT%

REM Start server using npx serve
npx --yes serve "%DIR%" -l %PORT%

