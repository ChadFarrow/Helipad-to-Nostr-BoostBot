#!/bin/bash

# BoostBot Ubuntu Deployment Script
# This script handles deployment and updates of BoostBot on Ubuntu server

set -e  # Exit on any error

# Configuration
REPO_URL="https://github.com/ChadFarrow/Helipad-to-Nostr-BoostBot.git"
PROJECT_DIR="/opt/boostbot"
CONTAINER_NAME="helipad-boostbot"
SERVICE_NAME="boostbot"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        error "This script should not be run as root. Please run as a regular user with sudo privileges."
        exit 1
    fi
}

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install Docker first."
        echo "Run: sudo apt update && sudo apt install docker.io docker-compose"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed. Please install Docker Compose first."
        echo "Run: sudo apt install docker-compose"
        exit 1
    fi
    
    log "Docker and Docker Compose are installed"
}

# Install Docker if not present
install_docker() {
    log "Installing Docker and Docker Compose..."
    
    # Update package list
    sudo apt update
    
    # Install Docker
    sudo apt install -y docker.io docker-compose
    
    # Start and enable Docker service
    sudo systemctl start docker
    sudo systemctl enable docker
    
    # Add user to docker group
    sudo usermod -aG docker $USER
    
    log "Docker installed successfully. You may need to log out and back in for group changes to take effect."
}

# Setup firewall
setup_firewall() {
    log "Setting up firewall rules..."
    
    # Allow SSH (if not already allowed)
    sudo ufw allow ssh
    
    # Allow BoostBot port
    sudo ufw allow 3333
    
    # Enable firewall if not already enabled
    if ! sudo ufw status | grep -q "Status: active"; then
        sudo ufw --force enable
    fi
    
    log "Firewall configured - port 3333 is open"
}

# Initial setup
initial_setup() {
    log "Performing initial setup..."
    
    # Create project directory
    sudo mkdir -p $PROJECT_DIR
    sudo chown $USER:$USER $PROJECT_DIR
    
    # Clone repository
    if [ ! -d "$PROJECT_DIR/.git" ]; then
        log "Cloning repository..."
        git clone $REPO_URL $PROJECT_DIR
    else
        log "Repository already exists, pulling latest changes..."
        cd $PROJECT_DIR
        git pull origin main
    fi
    
    # Create necessary directories
    mkdir -p $PROJECT_DIR/data
    mkdir -p $PROJECT_DIR/logs
    
    # Set up environment file if it doesn't exist
    if [ ! -f "$PROJECT_DIR/.env" ]; then
        log "Creating .env file from template..."
        cp $PROJECT_DIR/env.example $PROJECT_DIR/.env
        warn "Please edit $PROJECT_DIR/.env with your actual configuration values"
        warn "Required: NOSTR_BOOST_BOT_NSEC and HELIPAD_WEBHOOK_TOKEN"
    fi
    
    log "Initial setup completed"
}

# Deploy/Update the application
deploy() {
    log "Deploying BoostBot..."
    
    cd $PROJECT_DIR
    
    # Pull latest changes
    log "Pulling latest code from GitHub..."
    git pull origin main
    
    # Stop existing container if running
    if docker ps -q -f name=$CONTAINER_NAME | grep -q .; then
        log "Stopping existing container..."
        docker-compose down
    fi
    
    # Build and start container
    log "Building and starting container..."
    docker-compose up -d --build
    
    # Wait for container to be healthy
    log "Waiting for container to be ready..."
    sleep 10
    
    # Check if container is running
    if docker ps -q -f name=$CONTAINER_NAME | grep -q .; then
        log "✅ BoostBot deployed successfully!"
        log "Container is running on port 3333"
        log "Check logs with: docker logs $CONTAINER_NAME"
    else
        error "❌ Container failed to start. Check logs with: docker logs $CONTAINER_NAME"
        exit 1
    fi
}

# Check status
status() {
    log "Checking BoostBot status..."
    
    cd $PROJECT_DIR
    
    # Check if container is running
    if docker ps -q -f name=$CONTAINER_NAME | grep -q .; then
        log "✅ Container is running"
        
        # Check health endpoint
        if command -v curl &> /dev/null; then
            if curl -s http://localhost:3333/health &> /dev/null; then
                log "✅ Health endpoint is responding"
            else
                warn "⚠️ Health endpoint is not responding"
            fi
        fi
        
        # Show recent logs
        log "Recent logs:"
        docker logs --tail 10 $CONTAINER_NAME
    else
        error "❌ Container is not running"
    fi
}

# Restart the application
restart() {
    log "Restarting BoostBot..."
    
    cd $PROJECT_DIR
    docker-compose restart
    
    log "✅ BoostBot restarted"
}

# Stop the application
stop() {
    log "Stopping BoostBot..."
    
    cd $PROJECT_DIR
    docker-compose down
    
    log "✅ BoostBot stopped"
}

# Show logs
logs() {
    log "Showing BoostBot logs..."
    
    if docker ps -q -f name=$CONTAINER_NAME | grep -q .; then
        docker logs -f $CONTAINER_NAME
    else
        error "Container is not running"
    fi
}

# Backup data
backup() {
    log "Creating backup..."
    
    BACKUP_DIR="/opt/boostbot-backups"
    BACKUP_FILE="boostbot-backup-$(date +%Y%m%d-%H%M%S).tar.gz"
    
    sudo mkdir -p $BACKUP_DIR
    
    cd $PROJECT_DIR
    tar -czf $BACKUP_DIR/$BACKUP_FILE data/ logs/ .env
    
    log "✅ Backup created: $BACKUP_DIR/$BACKUP_FILE"
}

# Show usage
usage() {
    echo "BoostBot Ubuntu Deployment Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  setup     - Initial setup (install Docker, clone repo, configure)"
    echo "  deploy    - Deploy/update the application"
    echo "  status    - Check application status"
    echo "  restart   - Restart the application"
    echo "  stop      - Stop the application"
    echo "  logs      - Show application logs"
    echo "  backup    - Create backup of data"
    echo "  help      - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 setup    # First time setup"
    echo "  $0 deploy   # Deploy latest changes"
    echo "  $0 status   # Check if running"
}

# Main script logic
main() {
    case "${1:-help}" in
        setup)
            check_root
            check_docker
            setup_firewall
            initial_setup
            deploy
            ;;
        deploy)
            check_docker
            deploy
            ;;
        status)
            status
            ;;
        restart)
            restart
            ;;
        stop)
            stop
            ;;
        logs)
            logs
            ;;
        backup)
            backup
            ;;
        help|--help|-h)
            usage
            ;;
        *)
            error "Unknown command: $1"
            usage
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@" 