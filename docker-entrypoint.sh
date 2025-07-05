#!/bin/sh

# Fix permissions for the data directory
echo "🔧 Fixing permissions for /app/data..."
chown -R boostbot:nodejs /app/data
chmod -R 755 /app/data

# Switch to boostbot user and run the application
echo "🚀 Starting BoostBot as boostbot user..."
exec su boostbot -c "npx tsx helipad-webhook.js" 