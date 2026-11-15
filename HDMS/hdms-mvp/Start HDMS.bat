@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title HDMS - Local server

echo.
echo ========================================
echo              HDMS - START
echo ========================================
echo.

where node >nul 2>&1
if errorlevel 1 goto no_node
where npm >nul 2>&1
if errorlevel 1 goto no_npm

for /f %%V in ('node -p "Number(process.versions.node.split('.')[0])"') do set "NODE_MAJOR=%%V"
if not defined NODE_MAJOR goto bad_node
if %NODE_MAJOR% LSS 20 goto old_node

if not exist "node_modules\next\package.json" (
    echo Dependencies are missing. Installing from package-lock.json...
    call npm ci --no-audit --no-fund
    if errorlevel 1 goto failed
)

powershell -NoProfile -Command "try { $null = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:3000' -TimeoutSec 2; exit 0 } catch { if ($_.Exception.Response) { exit 0 }; exit 1 }" >nul 2>&1
if not errorlevel 1 (
    echo HDMS is already responding on port 3000.
    start "" "http://localhost:3000"
    goto finished
)

echo Starting HDMS. Keep this window open while using the service.
echo The browser will open when the local server responds.
start "" /b powershell -NoProfile -WindowStyle Hidden -Command "$u='http://127.0.0.1:3000'; $until=(Get-Date).AddMinutes(2); while ((Get-Date) -lt $until) { try { $r=Invoke-WebRequest -UseBasicParsing -Uri $u -TimeoutSec 3; if ($r.StatusCode -ge 200) { Start-Process $u; exit 0 } } catch { if ($_.Exception.Response) { Start-Process $u; exit 0 } }; Start-Sleep -Seconds 2 }"

call npm run dev -- --port 3000
if errorlevel 1 goto failed

goto finished

:no_node
echo ERROR: Node.js is not installed or is not in PATH.
echo Install Node.js 20 or newer, then run this file again.
start "" "https://nodejs.org/"
goto failed

:no_npm
echo ERROR: npm was not found. Reinstall Node.js with npm included.
goto failed

:bad_node
echo ERROR: Could not read the installed Node.js version.
goto failed

:old_node
echo ERROR: HDMS requires Node.js 20 or newer.
node --version
start "" "https://nodejs.org/"
goto failed

:failed
echo.
echo HDMS could not be started. Read the error messages above.
pause
exit /b 1

:finished
echo.
echo HDMS launcher finished.
exit /b 0
