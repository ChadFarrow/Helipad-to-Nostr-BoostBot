# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Running the Bot
- `npm start` - Start the bot in production mode using tsx
- `npm run dev` - Start with auto-reload on file changes (development)
- `npm run auto-restart` - Run with automatic restart on failures (recommended for production)

### Monitoring and Management
- `npm run status` - Get detailed status information
- `npm run health` - Quick health check via curl
- `npm run dashboard` - Launch interactive dashboard overview
- `npm run monitor` - One-time status check
- `npm run watch` - Continuous monitoring (30s intervals)
- `npm run logs` - View detailed logs
- `npm run stop` - Stop the bot
- `npm run restart` - Restart the bot

### Service Management (macOS)
- `npm run install-service` - Install as launch agent for persistent operation
- `npm run uninstall-service` - Remove launch agent
- `npm run service-status` - Check service status
- `npm run service-logs` - View launch agent logs

### Docker Commands
- `npm run docker-check` - Pre-flight check before Docker deployment
- `docker-compose up -d` - Deploy with Docker Compose

### Testing Endpoints
The bot runs on port 3333 by default (configurable via PORT env var):
- POST `/helipad-webhook` - Main webhook endpoint
- GET `/health` - Health check
- GET `/test-music-show` - Test music show functionality

## Architecture Overview

### Core Components

**Main Entry Point**: `helipad-webhook.js`
- Express server handling webhook events from Helipad
- Integrates monitoring, health checks, and web dashboard
- Routes events to appropriate bot handlers

**Nostr Integration**: `lib/nostr-bot.ts`
- Handles all Nostr protocol interactions
- Manages relay connections and event posting
- Processes Helipad payment events and formats them for Nostr
- Groups split payments into sessions and posts the largest split after a 30-second delay
- Key function: `announceHelipadPayment()`

**Music Show Handler**: `lib/music-show-bot.ts`
- Special logic for music show boosts
- Artist attribution and show formatting
- Integrates with main bot for music-specific events

**AlbyHub NWC Client**: `lib/nwc-client.ts`
- Connects to AlbyHub via Nostr Wallet Connect (NIP-47)
- Subscribes to `payment_received` and `payment_sent` notifications
- Extracts boostagram data from TLV records (key `7629169`)
- Transforms NWC transactions into HelipadPaymentEvent format
- Falls back to polling `list_transactions` if notifications aren't supported
- Deduplicates with Helipad when both sources run simultaneously

### Data Flow
**Helipad Mode** (default):
1. Helipad sends webhook POST to `/helipad-webhook`
2. Express server validates and processes the payload
3. Event is routed to appropriate handler (regular boost or music show)
4. Bot formats the message and posts to configured Nostr relays

**AlbyHub NWC Mode** (set `NWC_URL` env var):
1. NWC client subscribes to payment notifications over Nostr relay
2. Incoming payments are checked for boostagram TLV data
3. Boostagram is decoded and transformed into HelipadPaymentEvent format
4. Event is routed through the same pipeline as Helipad webhooks

Both modes can run simultaneously with automatic deduplication.

### Key Dependencies
- `nostr-tools` - Nostr protocol implementation
- `@getalby/sdk` - Alby SDK for NWC (Nostr Wallet Connect) integration
- `express` - Web server framework
- `tsx` - TypeScript execution for Node.js
- `ws` - WebSocket implementation for Nostr relay connections

### Configuration
Environment variables (`.env` file):
- `NSEC` - Nostr private key (required)
- `HELIPAD_WEBHOOK_TOKEN` - Optional authentication token
- `PORT` - Server port (default: 3333)
- `TEST_MODE` - Set to 'true' to disable actual Nostr posting
- `NWC_URL` - AlbyHub NWC connection string (enables NWC mode, e.g. `nostr+walletconnect://pubkey?relay=wss://relay&secret=secret`)

Default Nostr relays are configured in `lib/nostr-bot.ts`.

### Deployment Contexts
- **Local Development**: Uses tsx with watch mode
- **macOS Production**: Launch agent for 24/7 operation
- **Ubuntu Server**: PM2 process manager (ecosystem.config.cjs)
- **Docker**: Containerized deployment with docker-compose

### TypeScript Configuration
- Target: ES2020
- Module: Node16
- Strict mode enabled
- Allows JavaScript files
- Source files in `lib/` and `scripts/` directories