@echo off
setlocal EnableExtensions
set "APP_DIR=%~dp0"
cd /d "%APP_DIR%"
title HDMS - Update from GitHub

echo.
echo ========================================
echo             HDMS - UPDATE
echo ========================================
echo.

where git >nul 2>&1
if errorlevel 1 goto no_git

for /f "delims=" %%R in ('git -C "%APP_DIR%" rev-parse --show-toplevel 2^>nul') do set "REPO_ROOT=%%R"
if not defined REPO_ROOT goto no_repo

for /f "delims=" %%B in ('git -C "%REPO_ROOT%" branch --show-current') do set "CURRENT_BRANCH=%%B"
if /i not "%CURRENT_BRANCH%"=="main" goto wrong_branch

for /f "delims=" %%S in ('git -C "%REPO_ROOT%" status --porcelain') do set "HAS_LOCAL_CHANGES=1"
if defined HAS_LOCAL_CHANGES goto local_changes

echo Fetching the latest HDMS version from origin/main...
git -C "%REPO_ROOT%" pull --ff-only origin main
if errorlevel 1 goto update_failed

echo.
echo Installing the exact dependency versions from package-lock.json...
cd /d "%APP_DIR%"
call npm ci --no-audit --no-fund
if errorlevel 1 goto update_failed

echo.
echo HDMS is updated. Run "Check HDMS.bat" to verify the project.
pause
exit /b 0

:no_git
echo ERROR: Git is not installed or is not in PATH.
goto failed

:no_repo
echo ERROR: This folder is not inside a Git repository.
goto failed

:wrong_branch
echo ERROR: The local repository is on branch "%CURRENT_BRANCH%", not "main".
echo Switch to main before updating this local copy.
goto failed

:local_changes
echo ERROR: Local Git changes were detected.
echo Update stopped to avoid overwriting your work.
git -C "%REPO_ROOT%" status --short
echo Commit, stash or otherwise preserve those changes, then run this file again.
goto failed

:update_failed
echo ERROR: Git update or dependency installation failed.
goto failed

:failed
echo.
pause
exit /b 1
