#!/bin/bash

# Fix permissions for BoostBot data directory
# This script should be run on the host system before starting the container

set -e

PROJECT_DIR="/opt/boostbot"
DATA_DIR="$PROJECT_DIR/data"
LOGS_DIR="$PROJECT_DIR/logs"

echo "🔧 Fixing permissions for BoostBot data directories..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ This script must be run as root (use sudo)"
    exit 1
fi

# Create directories if they don't exist
mkdir -p "$DATA_DIR"
mkdir -p "$LOGS_DIR"

# Set ownership to match the container user (UID 1001, GID 1001)
echo "Setting ownership to boostbot user (UID 1001)..."
chown -R 1001:1001 "$DATA_DIR"
chown -R 1001:1001 "$LOGS_DIR"

# Set permissions
echo "Setting permissions..."
chmod -R 755 "$DATA_DIR"
chmod -R 755 "$LOGS_DIR"

echo "✅ Permissions fixed!"
echo ""
echo "📁 Data directory: $DATA_DIR"
echo "📁 Logs directory: $LOGS_DIR"
echo ""
echo "🚀 You can now start the container:"
echo "   docker-compose up -d" 