# BoostBot - Nostr Boost Management

BoostBot is a Nostr bot that manages and automates boost interactions on the Nostr network.

## Features

- 🤖 **Automated Boost Management** - Handles boost interactions automatically
- 📊 **Statistics Tracking** - Monitors boost activity and performance
- 🔧 **Webhook Integration** - Receives boost requests via webhooks
- ⚡ **Real-time Processing** - Processes boosts quickly and efficiently
- 🛡️ **Secure Configuration** - Environment-based configuration management

## Quick Start

1. **Clone and Install**
   ```bash
   git clone [your-repo-url]
   cd BoostBot
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

3. **Run BoostBot**
   ```bash
   npm start
   ```

## Configuration

Create a `.env` file with:

```bash
# Required: Your Nostr private key
NOSTR_PRIVATE_KEY=your_nostr_private_key_here

# Optional: Port (default: 3333)
PORT=3333

# Optional: Webhook settings
WEBHOOK_SECRET=your_webhook_secret
```

## How It Works

1. **Webhook Reception** - BoostBot receives boost requests via webhooks
2. **Request Processing** - Validates and processes incoming boost requests
3. **Nostr Interaction** - Posts boosts to the Nostr network
4. **Statistics Tracking** - Records boost activity for analysis

## Commands

```bash
npm start          # Start BoostBot
npm run dev        # Start with file watching
npm run health     # Check if running
npm run status     # Get status info
```

## Technical Details

- **Built with**: Node.js, Express, nostr-tools
- **Monitoring**: Webhook-based request processing
- **Relays**: relay.damus.io, relay.nostr.band, nostr.mom, relay.primal.net
- **Port**: 3333 (configurable)

## Development

1. **Local Testing**: Bot runs on `http://localhost:3333`
2. **Health Check**: `curl http://localhost:3333/health`
3. **Status**: `curl http://localhost:3333/status`

## Security

- ✅ `.env` file is gitignored to protect your private keys
- ✅ Use `env.example` as template
- ✅ Never commit private keys to version control

## License

MIT