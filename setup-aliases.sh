#!/bin/bash

# Setup BoostBot aliases
# Run this once to add convenient aliases to your shell

BOT_DIR="/Users/chad-mini/Vibe/BoostBot"

echo "🚀 Setting up BoostBot aliases..."
echo "================================"

# Create aliases
echo "Adding aliases to your shell configuration..."

# Detect shell and add aliases
if [[ "$SHELL" == *"zsh"* ]]; then
    CONFIG_FILE="$HOME/.zshrc"
    echo "Detected zsh shell"
elif [[ "$SHELL" == *"bash"* ]]; then
    CONFIG_FILE="$HOME/.bashrc"
    echo "Detected bash shell"
else
    CONFIG_FILE="$HOME/.bashrc"
    echo "Defaulting to bash configuration"
fi

# Add aliases to shell config
cat >> "$CONFIG_FILE" << EOF

# BoostBot Aliases
alias bot-status="cd $BOT_DIR && npm run status"
alias bot-dashboard="cd $BOT_DIR && npm run dashboard"
alias bot-health="cd $BOT_DIR && npm run health"
alias bot-stop="cd $BOT_DIR && npm run stop"
alias bot-restart="cd $BOT_DIR && npm run restart"
alias bot-logs="cd $BOT_DIR && npm run logs"
alias bot-start="cd $BOT_DIR && npm start"
alias bot-watch="cd $BOT_DIR && npm run watch"
alias bot-auto="cd $BOT_DIR && npm run auto-restart"
EOF

echo "✅ Aliases added to $CONFIG_FILE"
echo ""
echo "🔄 Reload your shell configuration:"
echo "  source $CONFIG_FILE"
echo ""
echo "📱 Now you can use these commands from anywhere:"
echo "  bot-status     - Check bot status"
echo "  bot-dashboard  - Show dashboard"
echo "  bot-health     - Quick health check"
echo "  bot-stop       - Stop bot"
echo "  bot-restart    - Restart bot"
echo "  bot-logs       - View logs"
echo "  bot-start      - Start bot"
echo "  bot-watch      - Continuous monitoring"
echo "  bot-auto       - Auto-restart monitor"
echo ""
echo "💡 Or use the check-bot.sh script:"
echo "  ./check-bot.sh" 