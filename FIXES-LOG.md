# BoostBot Fixes Log

## Session: 2025-07-07 - Docker Rebuild & Music Show Fixes

### Issues Fixed:

1. **WebSocket Connectivity for Nostr Publishing**
   - **Problem**: "WebSocket is not defined" errors when publishing to Nostr relays
   - **Solution**: Added `ws` package dependency and WebSocket polyfill in `nostr-bot.ts`
   - **Files**: `package.json`, `lib/nostr-bot.ts`

2. **Docker Build Process**
   - **Problem**: Dockerfile trying to run non-existent `npm run build` script
   - **Solution**: Simplified Dockerfile to use `tsx` runtime directly, removed multi-stage build
   - **Files**: `Dockerfile`

3. **File Permissions in Docker**
   - **Problem**: Permission denied errors when saving files (boost sessions, stats)
   - **Solution**: Fixed Docker permissions by chowning entire `/app` directory to `boostbot` user
   - **Files**: `Dockerfile`

4. **Relay Connection Timeouts**
   - **Problem**: Intermittent connection timeouts when publishing to Nostr relays
   - **Solution**: Added 30-second timeout with automatic retry logic (2 attempts with 2-second delay)
   - **Files**: `lib/nostr-bot.ts`

5. **Music Show Post Formatting**
   - **Problem**: Music posts were hard to read, text ran together
   - **Solution**: Separated information into clear lines with spacing:
     ```
     🎵 Just listened to: Song Name
     
     🎤 Artist: Artist Name
     
     📻 Show: Show - Episode
     
     🎵 Listen: URL
     
     #hashtags
     ```
   - **Files**: `lib/music-show-bot.ts`

6. **Artist Name Detection**
   - **Problem**: Wrong artists showing (show names instead of actual artists)
   - **Solution**: Fixed logic to use TLV artist field directly instead of overriding with album names
   - **Files**: `lib/music-show-bot.ts`

7. **Hashtag Clickability on Nostr**
   - **Problem**: Hashtags with capital letters (#LNBeats) weren't clickable on Nostr clients
   - **Solution**: Changed to lowercase hashtags: `#v4vmusic #pc20 #valueverse #lnbeats`
   - **Files**: `lib/music-show-bot.ts`

8. **Debug Logging**
   - **Added**: TLV debug logging and music show event processing logs for troubleshooting
   - **Files**: `helipad-webhook.js`, `lib/music-show-bot.ts`

### Root Cause Analysis:
- Many issues were caused by using different AI agents (Claude Code vs Cursor) on different systems
- This led to duplicated work and conflicting approaches to the same problems
- **Recommendation**: Coordinate which agent works on which features, or use git branches

### Testing Environment:
- Built and tested on Ubuntu Server
- Docker container deployment
- All fixes verified working in production

### Commands for Future Docker Rebuilds:
```bash
# Stop existing containers
docker-compose down

# Rebuild without cache (after git pull)
docker-compose build --no-cache

# Start containers
docker-compose up -d

# If port 3333 is in use:
lsof -ti :3333 | xargs kill -9
```