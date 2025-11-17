@echo off
setlocal enabledelayedexpansion
REM Development environment check script for Windows

echo ========================================
echo Aeroleads Assignment - Environment Check
echo ========================================
echo.

set "ALL_OK=1"

REM Check Python
echo [1/4] Checking Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo [FAIL] Python is not installed or not in PATH
    set "ALL_OK=0"
) else (
    python --version 2>&1
    echo [OK] Python found
)
echo.

REM Check Ruby
echo [2/4] Checking Ruby...
ruby --version >nul 2>&1
if errorlevel 1 (
    echo [FAIL] Ruby is not installed or not in PATH
    set "ALL_OK=0"
) else (
    ruby --version 2>&1
    echo [OK] Ruby found
    
    REM Check if bundler is installed
    bundle --version >nul 2>&1
    if errorlevel 1 (
        echo [WARN] Bundler not found. Install with: gem install bundler
    ) else (
        echo [OK] Bundler found
    )
)
echo.

REM Check Node.js
echo [3/4] Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo [FAIL] Node.js is not installed or not in PATH
    set "ALL_OK=0"
) else (
    node --version 2>&1
    echo [OK] Node.js found
    
    REM Check npm
    npm --version >nul 2>&1
    if errorlevel 1 (
        echo [WARN] npm not found
    ) else (
        npm --version 2>&1
        echo [OK] npm found
    )
)
echo.

REM Check Docker
echo [4/4] Checking Docker...
docker --version >nul 2>&1
if errorlevel 1 (
    echo [WARN] Docker is not installed or not in PATH
    echo       Docker is optional but recommended for development
) else (
    docker --version 2>&1
    echo [OK] Docker found
    
    REM Check docker-compose
    docker-compose --version >nul 2>&1
    if errorlevel 1 (
        echo [WARN] docker-compose not found
    ) else (
        echo [OK] docker-compose found
    )
)
echo.

echo ========================================
if "!ALL_OK!"=="1" (
    echo Environment Check: PASSED
    echo All required dependencies are installed!
    echo.
    echo Next steps:
    echo   1. Run 'make bootstrap' to install application dependencies
    echo   2. Configure .env files for each application
    echo   3. Run 'make scrape', 'make autodialer', or 'make blog'
) else (
    echo Environment Check: FAILED
    echo Please install missing dependencies before proceeding.
    echo.
    echo Installation guides:
    echo   Python:  https://www.python.org/downloads/
    echo   Ruby:    https://rubyinstaller.org/
    echo   Node.js: https://nodejs.org/
    echo   Docker:  https://www.docker.com/products/docker-desktop
)
echo ========================================
echo.

if "!ALL_OK!"=="0" exit /b 1
exit /b 0
