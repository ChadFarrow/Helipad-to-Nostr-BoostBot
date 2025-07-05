# BoostBot Starter

> **Note**: This is the simplified starter version of BoostBot. For the full version with advanced features, see the [main repository](../).

A simplified version of BoostBot for new users. This bot receives Helipad webhooks and posts boosts to Nostr without the complex custom features of the full version.

## Features

- ✅ Receives Helipad webhooks
- ✅ Posts boosts to Nostr
- ✅ Docker support
- ✅ Health checks
- ✅ Simple logging
- ✅ Authentication support

## What's NOT included (compared to full version)

- ❌ Karma system
- ❌ Custom npub mappings
- ❌ Daily/weekly summaries
- ❌ Complex monitoring
- ❌ Boost session tracking
- ❌ Custom show-specific logic

## Quick Start

### 1. Clone and Setup

```bash
git clone <your-repo>
cd boostbot-starter
cp env.example .env
```

### 2. Configure Environment

Edit `.env` file:

```bash
# Required: Your Nostr private key
NOSTR_BOOST_BOT_NSEC=nsec1your_actual_nsec_here

# Optional: Webhook authentication
HELIPAD_WEBHOOK_TOKEN=your_webhook_token_here

# Optional: Test mode (logs without posting)
TEST_MODE=false
```

### 3. Run with Docker

```bash
# Build and start
docker compose up -d

# Check logs
docker compose logs -f

# Stop
docker compose down
```

### 4. Run Locally

```bash
# Install dependencies
npm install

# Start in development mode
npm run dev

# Or start in production
npm start
```

## API Endpoints

- `GET /` - Status page
- `GET /health` - Health check
- `GET /status` - Bot status
- `POST /helipad-webhook` - Webhook endpoint

## Webhook Format

The bot expects Helipad webhook events in this format:

```json
{
  "index": 123,
  "time": 1234567890,
  "value_msat": 1000000,
  "value_msat_total": 1000000,
  "action": 2,
  "sender": "user123",
  "app": "helipad",
  "message": "Great episode!",
  "podcast": "My Podcast",
  "episode": "Episode 1",
  "tlv": "..."
}
```

## Nostr Posting

The bot will post to Nostr when:
- `action` is `2` (Boost)
- `value_msat_total` is greater than 0

Posts include:
- Amount in sats
- Sender name (if available)
- Podcast name (if available)
- Message (if provided)
- Standard hashtags

## Docker Commands

```bash
# Build image
npm run docker:build

# Start container
npm run docker:run

# Stop container
npm run docker:stop

# View logs
npm run docker:logs

# Check status
npm run docker:status
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NOSTR_BOOST_BOT_NSEC` | Yes | Your Nostr private key (nsec format) |
| `HELIPAD_WEBHOOK_TOKEN` | No | Authentication token for webhooks |
| `TEST_MODE` | No | Set to 'true' for test mode |
| `PORT` | No | Server port (default: 3333) |
| `LOG_LEVEL` | No | Log level (default: INFO) |

## Getting a Nostr Key

1. Visit https://nostr-keygen.com/
2. Generate a new key pair
3. Copy the `nsec` (private key) to your `.env` file
4. Keep your `npub` (public key) for reference

## Troubleshooting

### Bot not posting to Nostr
- Check `NOSTR_BOOST_BOT_NSEC` is set correctly
- Verify the nsec format is valid
- Check logs for errors

### Webhook not working
- Verify the webhook URL is correct
- Check authentication token if configured
- Ensure the webhook payload format is correct

### Docker issues
- Check if port 3333 is available
- Verify Docker and Docker Compose are installed
- Check container logs: `docker compose logs`

## Development

```bash
# Install dependencies
npm install

# Run in development mode with auto-reload
npm run dev

# Build TypeScript
npm run build
```

## License

MIT License 