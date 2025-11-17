#!/bin/bash
# Development environment check script for Unix/WSL/Git Bash

echo "========================================"
echo "Aeroleads Assignment - Environment Check"
echo "========================================"
echo ""

ALL_OK=1

# Check Python
echo "[1/4] Checking Python..."
if command -v python &> /dev/null; then
    PYTHON_VERSION=$(python --version 2>&1 | awk '{print $2}')
    echo "[OK] Python $PYTHON_VERSION found"
    
    # Check Python version is 3.8+
    PYTHON_MAJOR=$(echo $PYTHON_VERSION | cut -d. -f1)
    PYTHON_MINOR=$(echo $PYTHON_VERSION | cut -d. -f2)
    
    if [ "$PYTHON_MAJOR" -lt 3 ] || ([ "$PYTHON_MAJOR" -eq 3 ] && [ "$PYTHON_MINOR" -lt 8 ]); then
        echo "[WARN] Python 3.8+ required, found $PYTHON_VERSION"
        ALL_OK=0
    fi
elif command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
    echo "[OK] Python $PYTHON_VERSION found"
    
    PYTHON_MAJOR=$(echo $PYTHON_VERSION | cut -d. -f1)
    PYTHON_MINOR=$(echo $PYTHON_VERSION | cut -d. -f2)
    
    if [ "$PYTHON_MAJOR" -lt 3 ] || ([ "$PYTHON_MAJOR" -eq 3 ] && [ "$PYTHON_MINOR" -lt 8 ]); then
        echo "[WARN] Python 3.8+ required, found $PYTHON_VERSION"
        ALL_OK=0
    fi
else
    echo "[FAIL] Python is not installed or not in PATH"
    ALL_OK=0
fi
echo ""

# Check Ruby
echo "[2/4] Checking Ruby..."
if command -v ruby &> /dev/null; then
    RUBY_VERSION=$(ruby --version 2>&1 | awk '{print $2}')
    echo "[OK] Ruby $RUBY_VERSION found"
    
    # Check if bundler is installed
    if command -v bundle &> /dev/null; then
        echo "[OK] Bundler found"
    else
        echo "[WARN] Bundler not found. Install with: gem install bundler"
    fi
else
    echo "[FAIL] Ruby is not installed or not in PATH"
    ALL_OK=0
fi
echo ""

# Check Node.js
echo "[3/4] Checking Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version 2>&1)
    echo "[OK] Node.js $NODE_VERSION found"
    
    # Check npm
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version 2>&1)
        echo "[OK] npm $NPM_VERSION found"
    else
        echo "[WARN] npm not found"
    fi
else
    echo "[FAIL] Node.js is not installed or not in PATH"
    ALL_OK=0
fi
echo ""

# Check Docker
echo "[4/4] Checking Docker..."
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version 2>&1 | awk '{print $3}' | tr -d ',')
    echo "[OK] Docker $DOCKER_VERSION found"
    
    # Check docker-compose
    if command -v docker-compose &> /dev/null; then
        echo "[OK] docker-compose found"
    else
        echo "[WARN] docker-compose not found"
    fi
else
    echo "[WARN] Docker is not installed or not in PATH"
    echo "      Docker is optional but recommended for development"
fi
echo ""

echo "========================================"
if [ "$ALL_OK" -eq 1 ]; then
    echo "Environment Check: PASSED"
    echo "All required dependencies are installed!"
    echo ""
    echo "Next steps:"
    echo "  1. Run 'make bootstrap' to install application dependencies"
    echo "  2. Configure .env files for each application"
    echo "  3. Run 'make scrape', 'make autodialer', or 'make blog'"
else
    echo "Environment Check: FAILED"
    echo "Please install missing dependencies before proceeding."
    echo ""
    echo "Installation guides:"
    echo "  Python:  https://www.python.org/downloads/"
    echo "  Ruby:    https://www.ruby-lang.org/en/downloads/"
    echo "  Node.js: https://nodejs.org/"
    echo "  Docker:  https://www.docker.com/products/docker-desktop"
fi
echo "========================================"
echo ""

exit $((1 - ALL_OK))
