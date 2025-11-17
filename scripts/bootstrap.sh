#!/bin/bash
# Bootstrap script for Unix/WSL/Git Bash - Installs all dependencies

set -e

echo "========================================"
echo "Aeroleads Assignment - Bootstrap Script"
echo "========================================"
echo ""

# Check if running in correct directory
if [ ! -f "scripts/bootstrap.sh" ]; then
    echo "Error: Please run this script from the aeroleads-assignment root directory"
    exit 1
fi

echo "[1/3] Installing LinkedIn Scraper dependencies..."
echo ""
cd linkedin_scraper
if [ -f "requirements.txt" ]; then
    python -m pip install --upgrade pip
    python -m pip install -r requirements.txt
    echo "LinkedIn Scraper dependencies installed successfully!"
else
    echo "Warning: requirements.txt not found, skipping Python dependencies"
fi
cd ..
echo ""

echo "[2/3] Installing Autodialer dependencies..."
echo ""
cd autodialer
if [ -f "Gemfile" ]; then
    bundle install
    echo "Autodialer dependencies installed successfully!"
else
    echo "Warning: Gemfile not found, skipping Ruby dependencies"
fi
cd ..
echo ""

echo "[3/3] Installing Blog Generator dependencies..."
echo ""
cd ai_blog_generator
if [ -f "package.json" ]; then
    npm install
    echo "Blog Generator dependencies installed successfully!"
else
    echo "Warning: package.json not found, skipping Node.js dependencies"
fi
cd ..
echo ""

echo "========================================"
echo "Bootstrap Complete!"
echo "========================================"
echo ""
echo "All dependencies have been installed successfully."
echo "You can now run individual applications using:"
echo "  make scrape      - Run LinkedIn scraper"
echo "  make autodialer  - Start Rails server"
echo "  make blog        - Start Next.js dev server"
echo ""

exit 0
