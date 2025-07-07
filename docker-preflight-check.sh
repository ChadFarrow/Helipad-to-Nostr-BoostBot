#!/bin/bash

# Docker Preflight Check Script
# This script runs comprehensive checks before starting Docker

echo "🔍 Running Docker Preflight Check..."
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the BoostBot directory."
    exit 1
fi

# Run the Node.js preflight check
if command -v npm &> /dev/null; then
    npm run docker-check
    exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        echo ""
        echo "🎉 Preflight check passed! You can now run:"
        echo "   docker-compose up -d"
    else
        echo ""
        echo "❌ Preflight check failed. Please fix the issues above before running Docker."
        exit 1
    fi
else
    echo "❌ Error: npm not found. Please install Node.js and npm."
    exit 1
fi 