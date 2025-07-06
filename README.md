# BoostBot - Helipad to Nostr Webhook Bot

A webhook receiver that connects Helipad payments to a Nostr bot for automatic posting of boost events.

## Features

- **Webhook Receiver**: Listens for Helipad payment events on port 3001
- **Nostr Integration**: Automatically posts boost events to multiple Nostr relays
- **Daily/Weekly Summaries**: Posts automated summaries of boost activity
- **Comprehensive Monitoring**: Full suite of monitoring and management tools
- **Auto-Restart**: Automatic recovery from failures
- **Health Checks**: Built-in health monitoring endpoints
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
   PORT=3001
   ```

3. **Start the bot:**
   ```bash
   npm start
   ```

## Persistent Operation (macOS)

**Keep your bot running 24/7, even when your Mac is locked or sleeping!**

### Quick Setup
```bash
./setup-persistent-bot.sh
```

This will:
- Install a macOS launch agent
- Configure auto-start on login
- Keep the bot running when your Mac is locked/sleeping
- Auto-restart on crashes
- Log all activity

### Manual Setup
```bash
# Install the persistent service
npm run install-service

# Check if it's running
npm run service-status

# View service logs
npm run service-logs

# Remove the service (if needed)
npm run uninstall-service
```

### What This Does
- **Launch Agent**: Creates a system service that starts automatically
- **Keep Alive**: Ensures the bot stays running even during sleep/lock
- **Auto-Restart**: Automatically recovers from crashes
- **Logging**: All activity is logged to `logs/launch-agent.log`
- **Background**: Runs completely in the background

### Benefits
- ✅ Bot runs 24/7 without manual intervention
- ✅ Survives Mac sleep, lock, and restarts
- ✅ Automatic crash recovery
- ✅ No need to keep Terminal open
- ✅ Starts automatically when you log in

## Monitoring & Management

### Quick Status Check
```bash
npm run status      # Detailed status information
npm run health      # Quick health check
npm run dashboard   # Beautiful dashboard overview
```

### Process Management
```bash
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

## Webhook Endpoints

- **POST** `/helipad-webhook` - Main webhook endpoint for Helipad events
- **GET** `/health` - Health check endpoint
- **GET** `/test-daily-summary` - Test daily summary posting
- **GET** `/test-weekly-summary` - Test weekly summary posting

## Development

For development with auto-restart on file changes:
```bash
npm run dev
```

## Monitoring Features

### Status Dashboard
The dashboard provides a comprehensive overview:
- Process status and health
- System resource usage
- Network connectivity
- Quick action buttons

### Auto-Restart Monitor
- Checks bot health every minute
- Automatically restarts on failure
- Limits restarts to prevent infinite loops
- Logs all restart attempts

### Health Monitoring
- Built-in health endpoint
- Process monitoring
- Port availability checking
- Status file tracking

## Configuration

### Environment Variables
- `NSEC`: Your Nostr private key (required)
- `HELIPAD_WEBHOOK_TOKEN`: Optional authentication token
- `PORT`: Webhook server port (default: 3001)
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
1. Check if port 3001 is in use: `lsof -i :3001`
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
3. Check webhook URL: `http://localhost:3001/helipad-webhook`
4. Verify authentication token

## Production Deployment

For production environments:
1. Use `npm run auto-restart` for automatic failure recovery
2. Set up log rotation
3. Monitor system resources
4. Consider using PM2 or systemd for process management
5. Set up alerts for downtime

## Files Structure

```
BoostBot/
├── helipad-webhook.js     # Main webhook server
├── lib/
│   └── nostr-bot.ts       # Nostr bot implementation
├── scripts/
│   ├── status.js          # Status checking script
│   ├── stop.js            # Process stopping script
│   ├── restart.js         # Process restart script
│   ├── logs.js            # Log viewing script
│   ├── auto-restart.js    # Auto-restart monitor
│   └── dashboard.js       # Dashboard overview
├── monitor.js             # Status monitoring
├── package.json           # Dependencies and scripts
└── MONITORING.md          # Detailed monitoring guide
```

## Support

For detailed monitoring instructions, see [MONITORING.md](MONITORING.md).

## License

MIT