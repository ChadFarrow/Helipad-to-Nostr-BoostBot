# Received Boost Functionality - TODO for Tomorrow

## What Was Removed Today

### Files Deleted
- `helipad-webhook-received.js` - The separate webhook server for received boosts (port 3332)

### PM2 Processes Stopped/Removed
- `boostbot-received` - PM2 process for the received webhook

### Package.json Scripts Removed
- `start-received` - Start received webhook
- `start-both` - Start both webhooks
- `dev-received` - Dev mode for received webhook
- `health-received` - Health check for received webhook
- `health-both` - Health check for both webhooks

### Files Updated
- `package.json` - Removed received webhook scripts
- `WEBHOOK-MANAGEMENT.md` - Updated to only show sent webhook
- `scripts/manage-webhooks.js` - Removed received webhook functionality

## Current Status
- Only the **SENT** webhook is running (port 3333)
- All boosts (sent and received) are being processed by the main webhook
- The main webhook calls `announceHelipadPayment` for all boosts
- The filtering logic in `lib/nostr-bot.ts` determines which boosts get posted to Nostr
- Currently, only sent boosts are posted to Nostr (received boosts are skipped)

## To Restore Received Boost Functionality Tomorrow

### 1. Recreate the Received Webhook File
Create `helipad-webhook-received.js` with:
- Port 3332
- Same authentication setup as main webhook
- Call `announceHelipadPayment` for all received boosts
- Proper logging

### 2. Update Package.json
Add back the scripts:
- `start-received`
- `start-both`
- `dev-received`
- `health-received`
- `health-both`

### 3. Update Management Scripts
- Update `scripts/manage-webhooks.js` to handle both webhooks
- Update `WEBHOOK-MANAGEMENT.md` to document both webhooks

### 4. Update Nostr Bot Logic
In `lib/nostr-bot.ts`, modify the filtering logic:
- Remove the "skip received boost" logic from the main webhook
- Ensure received boosts are posted to Nostr when processed by the received webhook

### 5. Helipad Configuration
- Set up separate webhook in Helipad for received boosts
- Point to port 3332 for received boosts
- Point to port 3333 for sent boosts

### 6. PM2 Setup
- Start the received webhook with PM2
- Configure auto-restart
- Set up proper naming (`boostbot-received`)

## Key Files to Reference
- `helipad-webhook.js` - Template for the received webhook
- `lib/nostr-bot.ts` - Contains the `announceHelipadPayment` function
- `lib/logger.js` - Logging setup
- `.env` - Environment variables and authentication

## Testing
- Test sent boosts still work (port 3333)
- Test received boosts work (port 3332)
- Verify both post to Nostr correctly
- Check logs for both webhooks

## Notes
- The main webhook currently processes ALL boosts but only posts sent ones to Nostr
- The received webhook should process ALL boosts and post received ones to Nostr
- Both webhooks should log to the same log file (`boostbot.log`)
- Authentication is currently disabled (token commented out in .env) 