# Webhook Management Guide

## Overview
Your BoostBot has a single webhook server to handle sent boosts:

- **Port 3333** (SENT boosts): `http://192.168.0.238:3333/helipad-webhook`

## Quick Status Check
```bash
# Check webhook health
npm run health

# Or use the management script
node scripts/manage-webhooks.js status
```

## Starting Webhook

### Start Webhook
```bash
npm run start
```

### Using Management Script
```bash
# Start webhook
node scripts/manage-webhooks.js start sent
```

## Stopping Webhook

### Stop Webhook
```bash
npm run stop
```

### Stop Specific Webhook
```bash
# Using management script
node scripts/manage-webhooks.js stop sent
```

## Health Checks

### Check Webhook
```bash
npm run health
```

## Manual Health Checks
```bash
# Check webhook (port 3333)
curl http://localhost:3333/health
```

## Troubleshooting

### If webhook isn't working:
1. Check if it's running: `npm run health`
2. If not running, start it: `npm run start`
3. Check logs: `npm run logs`

### If webhook stopped:
1. Restart: `npm run start`

### If you need to restart everything:
```bash
npm run stop
npm run start
```

## Helipad Configuration
Make sure your Helipad webhook is configured correctly:

- **SENT boosts**: `http://192.168.0.238:3333/helipad-webhook`

## Files
- `helipad-webhook.js` - SENT boosts server (port 3333)
- `scripts/manage-webhooks.js` - Management script for webhook 