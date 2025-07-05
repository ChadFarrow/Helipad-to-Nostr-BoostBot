#!/bin/bash

# BoostBot Systemd Service Installer
# This script creates a systemd service to auto-start BoostBot on boot

set -e

PROJECT_DIR="/opt/boostbot"
SERVICE_NAME="boostbot"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
USER="ubuntu"

echo "🔧 Installing BoostBot systemd service..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ This script must be run as root (use sudo)"
    exit 1
fi

# Check if project directory exists
if [ ! -d "$PROJECT_DIR" ]; then
    echo "❌ Project directory $PROJECT_DIR not found"
    echo "   Run the deploy script first: ./deploy-ubuntu.sh setup"
    exit 1
fi

# Create systemd service file
cat > "$SERVICE_FILE" << EOF
[Unit]
Description=BoostBot Docker Container
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$PROJECT_DIR
User=$USER
Group=$USER
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd and enable service
systemctl daemon-reload
systemctl enable $SERVICE_NAME

echo "✅ Systemd service installed and enabled"
echo ""
echo "📋 Service commands:"
echo "  sudo systemctl start $SERVICE_NAME    # Start the service"
echo "  sudo systemctl stop $SERVICE_NAME     # Stop the service"
echo "  sudo systemctl restart $SERVICE_NAME  # Restart the service"
echo "  sudo systemctl status $SERVICE_NAME   # Check service status"
echo "  sudo systemctl disable $SERVICE_NAME  # Disable auto-start on boot"
echo ""
echo "🔍 Check if service is enabled:"
echo "  sudo systemctl is-enabled $SERVICE_NAME"
echo ""
echo "📝 View service logs:"
echo "  sudo journalctl -u $SERVICE_NAME -f"
echo ""
echo "🎉 BoostBot will now automatically start on system boot!" 