# 🎵 Music Show Post Feature

## Overview

The Music Show Post feature automatically detects when you finish listening to songs on your UpBEATs show and posts about them to Nostr. It tracks your listening activity in real-time and creates engaging posts with song information, duration, and engagement statistics.

## 🚀 How It Works

### Song Detection
- **Real-time monitoring** of Helipad webhook events
- **Automatic song transition detection** using `remote_podcast` and `remote_episode` fields
- **Smart timing** - detects when songs end and new ones begin
- **Engagement tracking** - counts streams, boosts, and total sats per song

### Nostr Integration
- **Automatic posting** when songs finish
- **Rich content** including song details, duration, and engagement stats
- **Proper tagging** with #UpBEATs #MusicShow #NostrMusic
- **Test mode support** for safe development

## 📊 Features

### Real-time Song Tracking
- **Current song display** - See what's playing right now
- **Song history** - Track all songs played in a session
- **Engagement analytics** - Monitor streams, boosts, and sats per song
- **Duration calculation** - Automatic timing of song plays

### Web Dashboard
- **Live updates** - Real-time song information
- **Statistics overview** - Total songs, sats, boosts, and averages
- **Song history** - Scrollable list of recent songs
- **Mobile responsive** - Works on all devices

### API Endpoints
- `GET /music-show/current` - Current song information
- `GET /music-show/history?limit=10` - Recent song history
- `GET /music-show/stats` - Show statistics

## 🛠️ Implementation

### Core Components

#### `lib/music-show-bot.ts`
The main music show bot that:
- Processes Helipad webhook events
- Detects song transitions
- Tracks song statistics
- Posts to Nostr when songs finish

#### `public/music-show.html`
Beautiful web dashboard showing:
- Current song information
- Real-time statistics
- Song history with engagement data
- Auto-refreshing every 30 seconds

#### Webhook Integration
Added to `helipad-webhook.js`:
- Automatic music show event processing
- Integration with existing Nostr bot
- Error handling and logging

### Data Flow

1. **Helipad Webhook** → Receives streaming/boost events
2. **Event Processing** → Extracts song information from `remote_podcast`/`remote_episode`
3. **Song Detection** → Identifies when songs start/end
4. **Statistics Tracking** → Accumulates engagement data
5. **Nostr Posting** → Posts about finished songs
6. **Dashboard Updates** → Real-time web interface updates

## 🎯 Usage

### Starting the Feature
```bash
# Start the bot with music show feature enabled
npm run dev

# Access the music show dashboard
# Open http://localhost:3333/music-show.html
```

### Testing the Feature
```bash
# Run the music show test script
npm run test-music-show
```

### Monitoring
```bash
# Check current song
curl http://localhost:3333/music-show/current

# Get song history
curl http://localhost:3333/music-show/history

# View statistics
curl http://localhost:3333/music-show/stats
```

## 📝 Example Nostr Posts

When you finish listening to a song, the bot automatically posts:

```
🎵 Just finished listening to:
🎶 Bloodshot Lies - The Album
📝 My Brother
⏱️ Duration: 3m 45s
💰 Total engagement: 75 sats
🚀 2 boosts
▶️ 3 streams

#UpBEATs #MusicShow #NostrMusic
```

## 🔧 Configuration

### Environment Variables
- `NSEC` - Your Nostr private key (required)
- `TEST_MODE` - Set to 'true' for test mode (no actual posting)

### Supported Shows
Currently configured for:
- **UpBEATs** - Your main music show
- **Any show with `remote_podcast` data** - Automatically detected

## 📈 Analytics

The feature tracks:
- **Total songs played** per session
- **Total sats earned** across all songs
- **Boost vs stream ratio** per song
- **Average engagement** per song
- **Listening duration** for each track

## 🎨 Customization

### Post Format
Edit `createSongPost()` in `lib/music-show-bot.ts` to customize:
- Post content and formatting
- Emoji usage
- Hashtags
- Statistics display

### Dashboard Styling
Modify `public/music-show.html` to:
- Change colors and themes
- Add new statistics
- Customize layout
- Add new features

### Song Detection Logic
Adjust in `lib/music-show-bot.ts`:
- Song transition timing
- Engagement thresholds
- Duration calculations
- Error handling

## 🚨 Troubleshooting

### Common Issues

**No songs detected:**
- Check if Helipad webhook is receiving events
- Verify `remote_podcast` field is populated
- Check logs for processing errors

**Posts not appearing on Nostr:**
- Verify `NSEC` environment variable is set
- Check if `TEST_MODE` is disabled
- Review Nostr bot connection logs

**Dashboard not updating:**
- Ensure bot is running on port 3333
- Check browser console for errors
- Verify API endpoints are responding

### Debug Commands
```bash
# Check bot status
npm run status

# View logs
npm run logs

# Test music show functionality
npm run test-music-show

# Health check
npm run health
```

## 🔮 Future Enhancements

### Planned Features
- **Playlist generation** - Auto-create show playlists
- **Artist analytics** - Track performance by artist
- **Show scheduling** - Post about upcoming shows
- **Integration with music platforms** - Connect to streaming services
- **Advanced analytics** - Detailed engagement reports

### Potential Integrations
- **Spotify API** - Enhanced song metadata
- **Last.fm** - Scrobbling integration
- **Music databases** - Rich artist information
- **Social media** - Cross-platform posting

## 📚 API Reference

### MusicShowBot Class

#### Methods
- `processMusicShowEvent(event)` - Process a webhook event
- `getCurrentSong()` - Get currently playing song
- `getRecentSongs(limit)` - Get recent song history
- `getShowStats()` - Get show statistics

#### Event Interface
```typescript
interface MusicShowEvent {
  timestamp: string;
  podcast: string;
  episode: string;
  remote_podcast?: string;
  remote_episode?: string;
  action: number;
  value_sat: number;
  sender: string;
  message?: string;
}
```

## 🎉 Getting Started

1. **Start the bot:** `npm run dev`
2. **Open dashboard:** http://localhost:3333/music-show.html
3. **Start listening:** Begin streaming your UpBEATs show
4. **Watch the magic:** See automatic posts appear on Nostr!

The Music Show Post feature transforms your listening experience into engaging social content, automatically sharing your musical journey with the Nostr community! 🎵✨ 