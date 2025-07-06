#!/bin/bash

# Docker BoostBot Startup Script
# This script ensures Docker is running and starts the BoostBot container

LOG_FILE="/Users/chad-mini/Vibe/BoostBot/logs/docker-startup.log"
PROJECT_DIR="/Users/chad-mini/Vibe/BoostBot"

# Create logs directory if it doesn't exist
mkdir -p "$(dirname "$LOG_FILE")"

# Function to log messages
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

log "Starting Docker BoostBot startup sequence..."

# Add Docker to PATH
export PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH"

# Wait for Docker Desktop to be ready (up to 2 minutes)
log "Waiting for Docker Desktop to be ready..."
for i in {1..24}; do
    if docker info >/dev/null 2>&1; then
        log "Docker is ready!"
        break
    fi
    if [ $i -eq 24 ]; then
        log "ERROR: Docker failed to start within 2 minutes"
        exit 1
    fi
    log "Waiting for Docker... ($i/24)"
    sleep 5
done

# Change to project directory
cd "$PROJECT_DIR" || {
    log "ERROR: Could not change to project directory: $PROJECT_DIR"
    exit 1
}

# Check if container is already running
if docker compose ps | grep -q "Up"; then
    log "BoostBot container is already running"
    exit 0
fi

# Start the Docker container
log "Starting BoostBot Docker container..."
if docker compose up -d; then
    log "BoostBot container started successfully"
    
    # Wait a moment and check if it's running
    sleep 5
    if docker compose ps | grep -q "Up"; then
        log "BoostBot container is running and healthy"
    else
        log "WARNING: BoostBot container may have issues - check docker logs"
    fi
else
    log "ERROR: Failed to start BoostBot container"
    exit 1
fi

log "Docker BoostBot startup sequence completed"