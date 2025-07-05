# BoostBot Starter

> **Note**: This is the simplified starter version of BoostBot. For the full version with advanced features, see the [main repository](../).

## Requirements

**Helipad and Alby Hub are required for this project.**

- Helipad is a simple LND poller and web front-end to see and read boosts and boostagrams.
- BoostBot Starter receives webhooks from Helipad and posts boosts to Nostr.
- You must have Helipad running and configured to send webhooks to BoostBot Starter.
- Get Helipad here: [https://github.com/Podcastindex-org/helipad](https://github.com/Podcastindex-org/helipad)
- **You will also need Alby Hub running on your node.**
  - Alby Hub is available in the app stores of [Umbrel](https://umbrel.com/) and [Start9](https://start9.com/).
  - See the Alby Hub guide: [https://guides.getalby.com/user-guide/alby-hub/alby-hub-flavors/umbrel-start9-etc](https://guides.getalby.com/user-guide/alby-hub/alby-hub-flavors/umbrel-start9-etc)
- **Helipad is most commonly run on:**
  - [Start9](https://start9.com/)
  - [Umbrel](https://umbrel.com/)
  - [RaspiBlitz](https://github.com/raspiblitz/raspiblitz)

**Note:** Currently, BoostBot Starter only posts **sent boosts** to Nostr. Support for received boosts and streams may be added in the future.

**⚠️ Security Disclaimer:** I recommend creating a new set of Nostr keys for this bot so you don't leak your personal ones.

**📱 Compatible Apps:** This only works with apps that use AlbyHub like Podverse, PodcastGuru, CurioCaster, Castamatic, and LNBeats. Find more compatible apps at [https://podcasting2.org/apps](https://podcasting2.org/apps).

A simplified version of BoostBot for new users. This bot receives Helipad webhooks and posts boosts to Nostr without the complex custom features of the full version.

## Features

- ✅ Receives Helipad webhooks
- ✅ Posts boosts to Nostr
- ✅ Simple setup (no TypeScript, no build step)
- ✅ Clear logging with emojis
- ✅ Health checks
- ✅ Easy testing

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
cd BoostBot/boostbot-starter
cp env.example .env
```

### 2. Configure Environment

Edit `.env` file with **only one required setting**:

```bash
# REQUIRED: Your Nostr private key
NOSTR_BOOST_BOT_NSEC=nsec1your_actual_nsec_here
```

That's it! All other settings are optional.

### 3. Install and Run

```bash
# Install dependencies
npm install

# Start the bot
npm start
```

### 4. Test It

In another terminal:
```bash
npm test
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

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NOSTR_BOOST_BOT_NSEC` | **Yes** | Your Nostr private key (nsec format) |
| `HELIPAD_WEBHOOK_TOKEN` | No | Authentication token for webhooks |
| `TEST_MODE` | No | Set to 'true' for test mode |
| `PORT` | No | Server port (default: 3333) |

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

### Bot won't start
- Make sure Node.js 18+ is installed
- Check that port 3333 is available
- Verify your `.env` file exists

## Development

```bash
# Install dependencies
npm install

# Start the bot
npm start

# Test the webhook
npm test
```

## File Structure

```
boostbot-starter/
├── 📄 README.md              # This documentation
├── 📄 env.example            # Environment template
├── 📄 package.json           # Dependencies
├── 📄 .gitignore             # Git ignore rules
├── 🧪 test-webhook.js        # Test script
├── 🤖 helipad-webhook.js     # Main webhook handler
└── 📁 lib/                   # Library files
    ├── 📄 logger.js          # Simple logging
    └── 📄 nostr-bot.js       # Nostr posting logic
```

## License

MIT License 