# BoostBot Starter - File Index

This directory contains the simplified starter version of BoostBot.

## 📁 File Structure

```
boostbot-starter/
├── 📄 README.md              # This documentation
├── 📄 INDEX.md               # This file
├── 📄 COMPARISON.md          # Comparison with full version
├── 📄 package.json           # Node.js dependencies
├── 📄 tsconfig.json          # TypeScript configuration
├── 📄 env.example            # Environment variables template
├── 📄 .env                   # Your environment variables (create this)
├── 📄 .gitignore             # Git ignore rules
├── 📄 .dockerignore          # Docker ignore rules
├── 🐳 Dockerfile             # Docker container definition
├── 🐳 docker-compose.yml     # Docker Compose configuration
├── 🚀 start.sh               # Easy startup script
├── 🧪 test-webhook.js        # Test script
├── 🤖 helipad-webhook.js     # Main webhook handler
├── 📁 lib/                   # Library files
│   ├── 📄 logger.js          # Simple logging
│   └── 📄 nostr-bot.ts       # Nostr posting logic
└── 📁 public/                # Static web files
    └── 📄 index.html         # Status page
```

## 🚀 Quick Start

1. **Setup Environment**
   ```bash
   cp env.example .env
   # Edit .env with your Nostr key
   ```

2. **Run with Docker** (Recommended)
   ```bash
   docker compose up -d
   ```

3. **Or Run Locally**
   ```bash
   npm install
   npm start
   ```

## 🔗 Related Files

- **[Main Repository](../)** - Full version with advanced features
- **[Full vs Starter Comparison](./COMPARISON.md)** - Detailed feature comparison
- **[Docker Setup](./Dockerfile)** - Container configuration
- **[Environment Variables](./env.example)** - Configuration template

## 📖 Documentation

- **[README.md](./README.md)** - Complete documentation
- **[COMPARISON.md](./COMPARISON.md)** - Feature comparison
- **[Docker Guide](./docker-compose.yml)** - Docker setup

## 🛠️ Development

- **[TypeScript Config](./tsconfig.json)** - TypeScript settings
- **[Package Config](./package.json)** - Dependencies and scripts
- **[Test Script](./test-webhook.js)** - Testing utilities 