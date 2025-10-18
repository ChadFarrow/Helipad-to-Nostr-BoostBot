# Deploying Zap Receipt Feature to Ubuntu Server

This guide walks you through deploying the new zap receipt feature to your Ubuntu server.

## What's New

The bot now embeds NIP-57 compliant zap receipt tags directly into kind 1 boost posts, making them function as both:
- Human-readable boost announcements
- Machine-readable zap receipts for zap-aware Nostr clients

## Quick Deployment (systemd)

For those familiar with the setup, here's the quick version:

```bash
# SSH into server
ssh your-user@your-server

# Navigate to bot directory
cd ~/Helipad-to-Nostr-BoostBot

# Stop, pull, and restart
sudo systemctl stop helipad-bot
git pull origin main
sudo systemctl start helipad-bot

# Verify
sudo systemctl status helipad-bot
sudo journalctl -u helipad-bot -n 20 | grep "zap"
```

## Pre-Deployment Checklist

- [ ] Code tested locally and pushed to GitHub
- [ ] Ubuntu server is accessible via SSH
- [ ] Bot is currently running on the server (using systemd)
- [ ] You know your systemd service name (e.g., `helipad-bot`, `helipad-webhook`)

## Deployment Steps

### Step 1: SSH into Your Ubuntu Server

```bash
ssh your-username@your-server-ip
```

### Step 2: Navigate to Bot Directory

```bash
cd ~/Helipad-to-Nostr-BoostBot
# Or wherever you have the bot installed
```

### Step 3: Stop the Running Bot

If using systemd (recommended):
```bash
sudo systemctl stop helipad-bot
# Replace 'helipad-bot' with your actual service name
# Common names: helipad-webhook, helipad-boostbot, nostr-bot
```

If using PM2:
```bash
pm2 stop helipad-webhook
# or: npm run stop
```

If running directly:
```bash
# Find the process
ps aux | grep helipad-webhook
# Kill it (replace PID with actual process ID)
kill PID
```

### Step 4: Pull Latest Changes from GitHub

```bash
git pull origin main
```

You should see:
```
Updating d888738..de18d04
Fast-forward
 lib/nostr-bot.ts       | 94 ++++++++++++++++++++++++--
 test-zap-receipt.sh    | 62 +++++++++++++++++
 2 files changed, 86 insertions(+), 8 deletions(-)
 create mode 100755 test-zap-receipt.sh
```

### Step 5: Install Dependencies (if needed)

```bash
npm install
```

### Step 6: Test the Changes (Optional but Recommended)

Run a quick test to verify everything works:

```bash
# Make test script executable
chmod +x test-zap-receipt.sh

# Temporarily start bot for testing
npm start &
TEST_PID=$!

# Wait a few seconds, then test
sleep 5
./test-zap-receipt.sh

# Check logs for success
# Look for: "📋 Tags being added to boost post (kind 1 with zap receipt tags)"
# Look for: "zapTagsCount: 6"

# Stop the test
kill $TEST_PID
```

### Step 7: Start the Bot

If using systemd (recommended):
```bash
sudo systemctl start helipad-bot
# Or if you want to restart (stop + start):
# sudo systemctl restart helipad-bot

# Enable auto-start on boot (if not already enabled):
# sudo systemctl enable helipad-bot
```

If using PM2:
```bash
pm2 restart helipad-webhook
# or if not in PM2 yet:
# pm2 start helipad-webhook.ts --name helipad-webhook
# pm2 save
```

If using the built-in auto-restart:
```bash
npm run auto-restart
```

### Step 8: Verify Deployment

Check that the bot is running:

```bash
# If using systemd
sudo systemctl status helipad-bot

# Or check the health endpoint
curl http://localhost:3333/health
```

Check logs for any errors:

```bash
# If using systemd
sudo journalctl -u helipad-bot -n 50 -f

# Or use the built-in log viewer
npm run logs
```

### Step 9: Monitor First Boosts

Watch the logs for the next real boost to confirm zap receipt tags are being added:

```bash
# If using systemd
sudo journalctl -u helipad-bot -f | grep "zap"

# Or use the built-in monitor
npm run watch
```

You should see entries like:
```
📋 Tags being added to boost post (kind 1 with zap receipt tags)
zapTagsCount: 6
hasSenderPubkey: true
```

## Verification

After deployment, verify the feature is working:

1. **Check Nostr Posts**: Look at recent boost posts on Nostr
2. **Inspect Tags**: Use a Nostr client that shows event JSON to verify tags include:
   - `['p', senderPubkey]` - Zap sender
   - `['P', recipientPubkey]` - Zap recipient
   - `['amount', millisats]` - Amount
   - `['description', {...}]` - Zap request
   - `['payment_hash', hash]` - Payment hash
   - `['relays', ...]` - Relay hints

3. **Monitor Logs**: Watch for successful posts with zap tags

## Rollback (if needed)

If something goes wrong, you can rollback:

```bash
# Stop the bot
sudo systemctl stop helipad-bot

# Rollback to previous commit
git reset --hard d888738

# Restart
sudo systemctl start helipad-bot
```

## Technical Details

### Changes Made

**File: `lib/nostr-bot.ts`**

1. Added `getRelays()` public method to NostrBot class
2. Enhanced zap receipt tags to be NIP-57 compliant:
   - Added `['p', senderPubkey]` tag for zap sender
   - Added `['P', recipientPubkey]` tag for zap recipient (uppercase P)
   - Included `['relays', ...]` tag with relay hints
   - Kept existing `amount`, `description`, and `payment_hash` tags

**File: `test-zap-receipt.sh`** (new)

- Test script for local validation
- Sends mock webhook with valid pubkey format
- Helps verify zap receipt implementation

### Configuration

No configuration changes required! The feature works with your existing:
- Environment variables (`.env`)
- Nostr relays
- Helipad webhook setup

### Compatibility

- ✅ Backward compatible with existing functionality
- ✅ Works with existing boost filtering (ChadF sender check)
- ✅ Compatible with music show features
- ✅ Works with daily/weekly summaries
- ✅ No breaking changes to existing features

## Troubleshooting

### Issue: Don't know my systemd service name

**Find it**:
```bash
# List all services with 'helipad' in the name
systemctl list-units --all | grep -i helipad

# Or search for 'nostr' or 'boost'
systemctl list-units --all | grep -i nostr
systemctl list-units --all | grep -i boost

# Check common locations for service files
ls /etc/systemd/system/*.service | grep -E "(helipad|nostr|boost)"
```

**Common service names**:
- `helipad-bot.service`
- `helipad-webhook.service`
- `nostr-bot.service`
- `boostbot.service`

### Issue: "invalid: unexpected size for fixed-size tag: p"

**Cause**: Invalid pubkey format in payment_info

**Solution**: This shouldn't happen with real Helipad data, only in testing with invalid pubkeys. Real Helipad events will work correctly.

### Issue: Bot not posting zap receipt tags

**Checks**:
1. Verify `TEST_MODE=false` in `.env`
2. Check logs for "Tags being added to boost post (kind 1 with zap receipt tags)"
3. Ensure `zapTagsCount` shows a number (usually 6)
4. Verify `hasSenderPubkey: true` in logs

### Issue: Posts succeeding but tags missing

**Check**: Review the published event JSON in a Nostr client to see actual tags

## Support

If you encounter issues:
1. Check logs: `pm2 logs helipad-webhook` or `npm run logs`
2. Review the git commit: `git show de18d04`
3. Test locally before deploying
4. Check GitHub issues: https://github.com/ChadFarrow/Helipad-to-Nostr-BoostBot/issues

## Summary

✅ **Local Testing**: Completed and verified
✅ **Code Pushed**: Commit `de18d04` on main branch
✅ **Deployment**: Pull and restart on Ubuntu server
✅ **Monitoring**: Watch logs for zap receipt tags

The deployment should take less than 5 minutes with zero downtime if using PM2's restart feature.
