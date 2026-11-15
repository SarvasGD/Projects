@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title HDMS - Project checks

echo.
echo ========================================
echo             HDMS - CHECK
echo ========================================
echo.

where node >nul 2>&1
if errorlevel 1 goto no_node
where npm >nul 2>&1
if errorlevel 1 goto no_npm

for /f %%V in ('node -p "Number(process.versions.node.split('.')[0])"') do set "NODE_MAJOR=%%V"
if not defined NODE_MAJOR goto bad_node
if %NODE_MAJOR% LSS 20 goto old_node

if not exist "node_modules\.bin\tsc.cmd" (
    echo Dependencies are missing. Installing...
    call npm ci --no-audit --no-fund
    if errorlevel 1 goto failed
)

echo.
echo Running TypeScript checks, automated tests and production build...
echo.
call npm run check
if errorlevel 1 goto failed

echo.
echo ========================================
echo       ALL HDMS CHECKS PASSED
echo ========================================
pause
exit /b 0

:no_node
echo ERROR: Node.js is not installed or is not in PATH.
goto failed

:no_npm
echo ERROR: npm was not found.
goto failed

:bad_node
echo ERROR: Could not read the installed Node.js version.
goto failed

:old_node
echo ERROR: HDMS requires Node.js 20 or newer.
node --version
goto failed

:failed
echo.
echo HDMS checks failed. Send the complete output from this window.
pause
exit /b 1
