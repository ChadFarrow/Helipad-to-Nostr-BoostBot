# BoostBot - Helipad to Nostr Webhook Bot

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