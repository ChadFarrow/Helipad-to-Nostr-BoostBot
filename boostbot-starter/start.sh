#!/bin/bash

# BoostBot Starter Startup Script

echo "🚀 Starting BoostBot Starter..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from example..."
    if [ -f env.example ]; then
        cp env.example .env
        echo "✅ Created .env file from env.example"
        echo "📝 Please edit .env file with your configuration before starting"
        exit 1
    else
        echo "❌ env.example not found. Please create a .env file manually"
        exit 1
    fi
fi

# Check if NOSTR_BOOST_BOT_NSEC is set
if ! grep -q "NOSTR_BOOST_BOT_NSEC=nsec1" .env; then
    echo "⚠️  NOSTR_BOOST_BOT_NSEC not configured in .env file"
    echo "📝 Please set your Nostr private key in the .env file"
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start the bot
echo "🎯 Starting bot..."
npm start 