#!/bin/sh

# Function to check for restart requests
check_restart_request() {
    local restart_flag="/app/data/restart-requested"
    if [ -f "$restart_flag" ]; then
        echo "🔄 Restart request detected, removing flag..."
        rm -f "$restart_flag"
        return 0
    fi
    return 1
}

# Function to start the application
start_application() {
    echo "🚀 Starting BoostBot..."
    exec npx tsx helipad-webhook.js
}

# Main entrypoint logic
echo "🐳 BoostBot Docker Container Starting..."

# Check if this is a restart request
if check_restart_request; then
    echo "✅ Restarting application..."
else
    echo "🆕 Fresh container start..."
fi

# Start the application
start_application 