#!/bin/bash

# BoostBot Docker Setup Script

set -e

echo "🐳 BoostBot Docker Setup"
echo "========================"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "   Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    echo "   Visit: https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✅ Docker and Docker Compose are installed"

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from template..."
    if [ -f env.example ]; then
        cp env.example .env
        echo "✅ Created .env file from env.example"
        echo "📝 Please edit .env with your actual values:"
        echo "   - NOSTR_BOOST_BOT_NSEC"
        echo "   - HELIPAD_WEBHOOK_TOKEN"
    else
        echo "❌ env.example not found. Please create .env file manually."
        exit 1
    fi
else
    echo "✅ .env file exists"
fi

# Create data directory if it doesn't exist
if [ ! -d data ]; then
    echo "📁 Creating data directory..."
    mkdir -p data
    echo "✅ Created data directory"
fi

# Create logs directory if it doesn't exist
if [ ! -d logs ]; then
    echo "📁 Creating logs directory..."
    mkdir -p logs
    echo "✅ Created logs directory"
fi

echo ""
echo "🚀 Ready to build and run BoostBot!"
echo ""
echo "Commands:"
echo "  docker-compose up -d    # Build and start in background"
echo "  docker-compose logs -f  # View logs"
echo "  docker-compose down     # Stop and remove containers"
echo "  docker-compose restart  # Restart the service"
echo ""
echo "Health check:"
echo "  curl http://localhost:3333/health"
echo ""
echo "📖 See DOCKER.md for more details" 