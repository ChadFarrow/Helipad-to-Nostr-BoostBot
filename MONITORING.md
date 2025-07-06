# BoostBot Monitoring Guide

This guide helps you monitor and manage your BoostBot to ensure it's always running properly.

## Quick Status Check

### Check if the bot is running:
```bash
npm run status
```

### Quick health check:
```bash
npm run health
```

### View detailed logs:
```bash
npm run logs
```

## Process Management

### Start the bot:
```bash
npm start
```

### Stop the bot:
```bash
npm run stop
```

### Restart the bot:
```bash
npm run restart
```

## Continuous Monitoring

### Run a one-time status check:
```bash
npm run monitor
```

### Watch the bot continuously (updates every 30 seconds):
```bash
npm run watch
```

### Auto-restart on failure (recommended for production):
```bash
npm run auto-restart
```

The auto-restart monitor:
- Checks the bot every minute
- Automatically restarts if the bot is unhealthy
- Limits restarts to 5 per hour to prevent infinite loops
- Logs all restart attempts

## What to Look For

### ✅ Good Signs:
- Status shows "✅ BoostBot is running"
- Health check returns "Webhook receiver is running"
- Process count shows 1-2 processes
- Port 3001 is in use

### ❌ Warning Signs:
- Status shows "❌ BoostBot is NOT running"
- Health check fails or times out
- No processes found
- Port 3001 is not in use

## Troubleshooting

### Bot won't start:
1. Check if port 3001 is already in use: `lsof -i :3001`
2. Kill any existing processes: `npm run stop`
3. Check for errors in the terminal where you started the bot
4. Verify your `.env` file has the required variables

### Bot stops unexpectedly:
1. Check the logs: `npm run logs`
2. Look for error messages in the terminal
3. Check system resources (CPU, memory)
4. Restart the bot: `npm run restart`
5. Use auto-restart for automatic recovery: `npm run auto-restart`

### Webhook not receiving:
1. Verify the bot is running: `npm run status`
2. Test the health endpoint: `npm run health`
3. Check your webhook URL: `http://localhost:3001/helipad-webhook`
4. Verify authentication token if configured

## Development Mode

For development with auto-restart on file changes:
```bash
npm run dev
```

## Status File

The bot creates a `bot-status.json` file with the latest status information. You can check this file to see the last known state of the bot.

## Endpoints

- **POST** `/helipad-webhook` - Main webhook endpoint
- **GET** `/health` - Health check
- **GET** `/test-daily-summary` - Test daily summary posting
- **GET** `/test-weekly-summary` - Test weekly summary posting

## Logs

The bot logs all activities to the console. Keep the terminal window open to see live logs, or use `npm run logs` to see recent activity.

## Automation

You can set up automated monitoring by:
1. Creating a cron job to run `npm run monitor` periodically
2. Using the `npm run watch` command in a separate terminal
3. Using `npm run auto-restart` for automatic failure recovery
4. Setting up systemd service (Linux) or launchd (macOS) for automatic restarts

## Production Deployment

For production environments, consider:
1. Using `npm run auto-restart` in a separate terminal or as a service
2. Setting up log rotation to prevent disk space issues
3. Monitoring system resources (CPU, memory, disk)
4. Setting up alerts for when the bot goes down
5. Using a process manager like PM2 or systemd for better reliability 