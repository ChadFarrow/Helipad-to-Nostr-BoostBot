#!/bin/bash

# BoostBot Quick Status Check
# Run this from anywhere to check if your bot is running

BOT_DIR="/Users/chad-mini/Vibe/BoostBot"

echo "🤖 BoostBot Status Check"
echo "========================"

# Check if bot directory exists
if [ ! -d "$BOT_DIR" ]; then
    echo "❌ Bot directory not found: $BOT_DIR"
    echo "💡 Update the BOT_DIR variable in this script"
    exit 1
fi

# Change to bot directory and run status check
cd "$BOT_DIR" && npm run status

echo ""
echo "💡 Quick commands:"
echo "  npm run dashboard  - Beautiful overview"
echo "  npm run health     - Quick health check"
echo "  npm run restart    - Restart bot"
echo "  npm run auto-restart - Auto-restart monitor" 