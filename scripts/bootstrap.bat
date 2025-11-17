@echo off
setlocal enabledelayedexpansion
REM Bootstrap script for Windows - Installs all dependencies

echo ========================================
echo Aeroleads Assignment - Bootstrap Script
echo ========================================
echo.

REM Check if running in correct directory
if not exist "scripts\bootstrap.bat" (
    echo Error: Please run this script from the aeroleads-assignment root directory
    exit /b 1
)

echo [1/3] Installing LinkedIn Scraper dependencies...
echo.
cd linkedin_scraper
if exist "requirements.txt" (
    python -m pip install --upgrade pip
    python -m pip install -r requirements.txt
    if errorlevel 1 (
        echo Error: Failed to install Python dependencies
        cd ..
        exit /b 1
    )
    echo LinkedIn Scraper dependencies installed successfully!
) else (
    echo Warning: requirements.txt not found, skipping Python dependencies
)
cd ..
echo.

echo [2/3] Installing Autodialer dependencies...
echo.
cd autodialer
if exist "Gemfile" (
    call bundle install
    if errorlevel 1 (
        echo Error: Failed to install Ruby dependencies
        cd ..
        exit /b 1
    )
    echo Autodialer dependencies installed successfully!
) else (
    echo Warning: Gemfile not found, skipping Ruby dependencies
)
cd ..
echo.

echo [3/3] Installing Blog Generator dependencies...
echo.
cd ai_blog_generator
if exist "package.json" (
    call npm install
    if errorlevel 1 (
        echo Error: Failed to install Node.js dependencies
        cd ..
        exit /b 1
    )
    echo Blog Generator dependencies installed successfully!
) else (
    echo Warning: package.json not found, skipping Node.js dependencies
)
cd ..
echo.

echo ========================================
echo Bootstrap Complete!
echo ========================================
echo.
echo All dependencies have been installed successfully.
echo You can now run individual applications using:
echo   make scrape      - Run LinkedIn scraper
echo   make autodialer  - Start Rails server
echo   make blog        - Start Next.js dev server
echo.

exit /b 0
