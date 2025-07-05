# BoostBot - Helipad to Nostr Webhook Bot

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

---

BoostBot receives Helipad webhooks and posts boosts to Nostr. Choose the version that fits your needs:

## 🚀 [BoostBot Starter](./boostbot-starter/) - For New Users
**Simple, easy-to-use version for getting started**

- ✅ Receives Helipad webhooks
- ✅ Posts boosts to Nostr  
- ✅ Docker support
- ✅ Health checks
- ✅ Simple logging
- ✅ Easy setup

**Perfect for:** New users, simple setups, basic webhook needs

[📖 Starter Documentation](./boostbot-starter/) | [🚀 Quick Start](./boostbot-starter/#quick-start)

---

## ⚡ BoostBot Full - For Advanced Users
**Complete feature set with advanced functionality**

- ✅ All Starter features
- ✅ Karma system for tracking engagement
- ✅ Custom npub mappings for shows
- ✅ Daily/weekly summaries
- ✅ Complex monitoring and live feeds
- ✅ Boost session tracking
- ✅ 20+ management scripts
- ✅ Advanced analytics

**Perfect for:** Podcast networks, content creators, advanced users

---

## Quick Comparison

| Feature | Starter | Full |
|---------|---------|------|
| **Core Functionality** |
| Helipad webhook reception | ✅ | ✅ |
| Nostr posting | ✅ | ✅ |
| Docker support | ✅ | ✅ |
| **Advanced Features** |
| Karma system | ❌ | ✅ |
| Custom show mappings | ❌ | ✅ |
| Daily/weekly summaries | ❌ | ✅ |
| Complex monitoring | ❌ | ✅ |
| **Complexity** |
| Lines of code | ~500 | ~3,000+ |
| Files | 10 | 30+ |
| Setup time | 5 minutes | 15+ minutes |

## Which Version Should You Choose?

### Start with **Starter** if:
- You're new to BoostBot
- You just want basic webhook → Nostr functionality
- You prefer simple, easy-to-understand code
- You don't need advanced analytics

### Use **Full** if:
- You need karma tracking and analytics
- You have custom show-specific requirements
- You want daily/weekly summaries
- You need advanced monitoring and management

## Quick Start

### For New Users (Recommended)
```bash
# Clone the repository
git clone [your-repo-url]
cd BoostBot/boostbot-starter

# Setup and run
cp env.example .env
# Edit .env with your Nostr key
docker compose up -d
```

### For Advanced Users
```bash
# Clone the repository  
git clone [your-repo-url]
cd BoostBot

# Setup and run
cp env.example .env
# Edit .env with your configuration
npm install
npm start
```

## Documentation

- **[Starter Version](./boostbot-starter/)** - Complete documentation for the simplified version
- **[Full vs Starter Comparison](./boostbot-starter/COMPARISON.md)** - Detailed feature comparison
- **[Docker Setup](./DOCKER.md)** - Docker configuration for full version
- **[Monitoring](./MONITORING.md)** - Monitoring and management for full version

## Migration Path

- **Starter → Full**: Add features from the full version as needed
- **Full → Starter**: Simplify by removing advanced features

## Support

- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/discussions)

## License

MIT License