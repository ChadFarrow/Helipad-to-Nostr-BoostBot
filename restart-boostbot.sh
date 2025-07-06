#!/bin/bash
# BoostBot Restart Script
# Run this after Mac reboot to restart BoostBot

echo "🚀 Starting BoostBot..."
echo "📁 Navigating to BoostBot directory..."
cd /Users/chad-mini/Vibe/BoostBot

echo "🐳 Checking Docker status..."
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Starting Docker Desktop..."
    open /Applications/Docker.app
    echo "⏳ Waiting for Docker to start (30 seconds)..."
    sleep 30
    
    # Wait for Docker to be ready
    while ! docker info > /dev/null 2>&1; do
        echo "⏳ Still waiting for Docker..."
        sleep 5
    done
fi

echo "✅ Docker is running!"
echo "🔄 Starting BoostBot container..."
docker compose up -d

echo "⏳ Waiting for BoostBot to be ready..."
sleep 10

echo "🔍 Checking BoostBot status..."
docker compose ps

echo "🏥 Health check..."
curl -s http://localhost:3333/health || echo "❌ Health check failed"

echo ""
echo "🎉 BoostBot restart complete!"
echo "📊 Dashboard: http://localhost:3333/"
echo "💖 Health: http://localhost:3333/health"