#!/bin/bash

echo "🤖 BoostBot Persistent Setup"
echo "============================"
echo ""

# Check if we're on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ This script is designed for macOS only."
    echo "   For other systems, use: npm run auto-restart"
    exit 1
fi

echo "📋 This will set up your BoostBot to run persistently:"
echo "   • Start automatically when you log in"
echo "   • Keep running when your Mac is locked or sleeping"
echo "   • Auto-restart if it crashes"
echo "   • Log all activity to logs/launch-agent.log"
echo ""

read -p "Continue? (y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Setup cancelled."
    exit 0
fi

echo ""
echo "🚀 Installing persistent service..."

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Create logs directory
mkdir -p logs

# Install the launch agent
npm run install-service

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Your bot is now configured to run persistently."
echo ""
echo "🔧 Useful commands:"
echo "   • Check bot status: npm run status"
echo "   • View service logs: npm run service-logs"
echo "   • Check service status: npm run service-status"
echo "   • Stop persistent service: npm run uninstall-service"
echo ""
echo "💡 The bot will now:"
echo "   • Start automatically when you log in"
echo "   • Keep running when your Mac is locked or sleeping"
echo "   • Auto-restart if it crashes"
echo ""
echo "🎉 You can now lock your Mac or let it sleep - your bot will keep running!" 