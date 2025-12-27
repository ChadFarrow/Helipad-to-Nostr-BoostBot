# BoostBot - Helipad to Nostr Webhook Bot

A webhook receiver that connects Helipad payments to a Nostr bot for automatic posting of boost events.

## Features

- **Webhook Receiver**: Listens for Helipad payment events on port 3333
- **Nostr Integration**: Automatically posts boost events to multiple Nostr relays
- **Daily/Weekly Summaries**: Posts automated summaries of boost activity
- **Music Show Support**: Special handling for music shows and artist boosts
- **Comprehensive Monitoring**: Full suite of monitoring and management tools
- **Auto-Restart**: Automatic recovery from failures
- **Health Checks**: Built-in health monitoring endpoints
- **Docker Support**: Containerized deployment for production
- **Persistent Operation**: macOS launch agent for 24/7 operation

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   Create a `.env` file with:
   ```
   NSEC=REPLACE_WITH_YOUR_ACTUAL_NOSTR_PRIVATE_KEY
   HELIPAD_WEBHOOK_TOKEN=optional_auth_token
   PORT=3333
   ```

3. **Start the bot:**
   ```bash
   npm start
   ```

## Deployment Options

### Local Development
```bash
npm run dev  # Development with auto-restart on file changes
```

### macOS Persistent Operation
Keep your bot running 24/7, even when your Mac is locked or sleeping:

```bash
./setup-persistent-bot.sh  # Quick setup
```

Or manually:
```bash
npm run install-service    # Install launch agent
npm run service-status     # Check if running
npm run service-logs       # View logs
npm run uninstall-service  # Remove service
```

### Docker Deployment
For production environments:

```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build manually
docker build -t boostbot .
docker run -d --name boostbot -p 4444:4444 --env-file .env boostbot
```

### Ubuntu Server Deployment
See [MIGRATION-TO-UBUNTU.md](MIGRATION-TO-UBUNTU.md) for detailed Ubuntu server setup instructions.

## Monitoring & Management

### Quick Commands
```bash
npm run status      # Detailed status information
npm run health      # Quick health check
npm run dashboard   # Beautiful dashboard overview
npm run stop        # Stop the bot
npm run restart     # Restart the bot
npm run logs        # View detailed logs
```

### Continuous Monitoring
```bash
npm run monitor     # One-time status check
npm run watch       # Continuous monitoring (30s intervals)
npm run auto-restart # Auto-restart on failure (recommended)
```

### Web Interface
Access the dashboard at `http://localhost:3333` for:
- Real-time status monitoring
- Live logs viewing
- Quick action buttons
- System resource usage

## Webhook Endpoints

- **POST** `/helipad-webhook` - Main webhook endpoint for Helipad events
- **GET** `/health` - Health check endpoint
- **GET** `/test-daily-summary` - Test daily summary posting
- **GET** `/test-weekly-summary` - Test weekly summary posting
- **GET** `/test-music-show` - Test music show functionality

## Configuration

### Environment Variables
- `NSEC`: Your Nostr private key (required)
- `HELIPAD_WEBHOOK_TOKEN`: Optional authentication token
- `PORT`: Webhook server port (default: 3333)
- `TEST_MODE`: Set to 'true' for test mode (no actual Nostr posting)

### Nostr Relays
Default relays (configurable in `lib/nostr-bot.ts`):
- wss://relay.damus.io
- wss://relay.nostr.band
- wss://relay.primal.net
- wss://7srr7chyc6vlhzpc2hl6lyungvluohzrmt76kbs4kmydhrxoakkbquad.local/
- wss://chadf.nostr1.com/

## Troubleshooting

### Bot won't start
1. Check if port 3333 is in use: `lsof -i :3333`
2. Kill existing processes: `npm run stop`
3. Check `.env` file configuration
4. Verify dependencies are installed

### Bot stops unexpectedly
1. Check logs: `npm run logs`
2. Use auto-restart: `npm run auto-restart`
3. Check system resources
4. Review error messages

### Webhook not receiving
1. Verify bot is running: `npm run status`
2. Test health endpoint: `npm run health`
3. Check webhook URL: `http://localhost:3333/helipad-webhook`
4. Verify authentication token

## Project Structure

```
BoostBot/
├── lib/
│   ├── nostr-bot.ts       # Main Nostr bot implementation
│   ├── karma-system.ts    # Karma tracking system
│   ├── music-show-bot.ts  # Music show specific logic
│   └── logger.js          # Logging utilities
├── scripts/
│   ├── status.js          # Status checking
│   ├── stop.js            # Process management
│   ├── restart.js         # Process restart
│   ├── logs.js            # Log viewing
│   ├── auto-restart.js    # Auto-restart monitor
│   ├── dashboard.js       # Dashboard overview
│   ├── karma-manager.js   # Karma system management
│   └── manage-webhooks.js # Webhook management
├── public/
│   └── index.html         # Web dashboard
├── helipad-webhook.js     # Main webhook server
├── monitor.js             # Status monitoring
├── docker-compose.yml     # Docker configuration
├── Dockerfile             # Docker build instructions
└── package.json           # Dependencies and scripts
```

## Documentation

- [MONITORING.md](MONITORING.md) - Detailed monitoring guide
- [DOCKER.md](DOCKER.md) - Docker deployment instructions
- [MIGRATION-TO-UBUNTU.md](MIGRATION-TO-UBUNTU.md) - Ubuntu server setup
- [MUSIC-SHOW-FEATURE.md](MUSIC-SHOW-FEATURE.md) - Music show functionality
- [WEBHOOK-MANAGEMENT.md](WEBHOOK-MANAGEMENT.md) - Webhook configuration

## License

MIT