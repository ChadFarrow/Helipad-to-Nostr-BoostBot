# BoostBot - Helipad to Nostr Webhook Bot

> **Note**: This is my custom version with advanced features. For a stripped-down starter version, see [BoostBot Starter](https://github.com/ChadFarrow/BoostBot-Starter).

## Requirements

**Helipad and Alby Hub are required for this project.**

- Helipad is a simple LND poller and web front-end to see and read boosts and boostagrams.
- BoostBot receives webhooks from Helipad and posts boosts to Nostr.
- You must have Helipad running and configured to send webhooks to BoostBot.
- Get Helipad here: [https://github.com/Podcastindex-org/helipad](https://github.com/Podcastindex-org/helipad)
- **You will also need Alby Hub running on your node.**
  - Alby Hub is available in the app stores of [Umbrel](https://umbrel.com/) and [Start9](https://start9.com/).
  - See the Alby Hub guide: [https://guides.getalby.com/user-guide/alby-hub/alby-hub-flavors/umbrel-start9-etc](https://guides.getalby.com/user-guide/alby-hub/alby-hub-flavors/umbrel-start9-etc)
- **Helipad is most commonly run on:**
  - [Start9](https://start9.com/)
  - [Umbrel](https://umbrel.com/)
  - [RaspiBlitz](https://github.com/raspiblitz/raspiblitz)

**Note:** Currently, BoostBot only posts **sent boosts** to Nostr. Support for received boosts and streams may be added in the future.

**⚠️ Security Disclaimer:** I recommend creating a new set of Nostr keys for this bot so you don't leak your personal ones.

**📱 Compatible Apps:** This only works with apps that use Lightning payments: Alby, Podverse, PodcastGuru, CurioCaster, Castamatic, and LNBeats. Find more compatible apps at [https://podcasting2.org/apps](https://podcasting2.org/apps).

---

BoostBot receives Helipad webhooks and posts boosts to Nostr with advanced features for tracking and analytics.

## Features

- ✅ Receives Helipad webhooks
- ✅ Posts boosts to Nostr
- ✅ Karma system for tracking engagement
- ✅ Custom npub mappings for shows
- ✅ Daily/weekly summaries
- ✅ Complex monitoring and live feeds
- ✅ Boost session tracking
- ✅ 20+ management scripts
- ✅ Advanced analytics
- ✅ Docker support
- ✅ Health checks

## Quick Start

```bash
# Clone the repository  
git clone https://github.com/ChadFarrow/Helipad-to-Nostr-BoostBot.git
cd Helipad-to-Nostr-BoostBot

# Setup and run
cp env.example .env
# Edit .env with your configuration
npm install
npm start
```

## Documentation

- **[Docker Setup](./DOCKER.md)** - Docker configuration
- **[Monitoring](./MONITORING.md)** - Monitoring and management

## Support

- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/discussions)

## License

MIT License