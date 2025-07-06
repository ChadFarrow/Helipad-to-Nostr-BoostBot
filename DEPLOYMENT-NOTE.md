# BoostBot Deployment Status

## Current Setup

This repository has been created to properly organize BoostBot files, but the **currently running BoostBot process** is still operating from the original location at `/home/server/`.

## Running Process Details

- **Current Location**: `/home/server/helipad-webhook.js`
- **Process User**: User ID 1001 (not server user)
- **Port**: 3333
- **Status**: Active and healthy

## Repository Organization

The BoostBot files have been organized into this separate git repository at `/home/server/BoostBot/` and successfully connected to https://github.com/ChadFarrow/Helipad-to-Nostr-BoostBot.git

## Future Migration

To fully migrate the running process to use this organized repository:

1. **Stop the current BoostBot process**
2. **Copy environment configuration** from the original location
3. **Update any systemd services or process managers** to point to `/home/server/BoostBot/`
4. **Restart BoostBot** from the new location

## Current Status

- ✅ Repository created and synced with GitHub
- ✅ All BoostBot files organized in separate directory
- ✅ Git repository properly configured
- ⚠️ **Running process still uses original location** (to avoid service disruption)
- ⚠️ **Future deployments should use this organized repository**

## Recommendation

The next time BoostBot needs to be restarted or updated, use this organized repository location instead of the mixed server directory.