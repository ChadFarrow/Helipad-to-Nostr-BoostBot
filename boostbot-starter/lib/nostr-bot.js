// Simple Nostr bot for BoostBot Starter
// This file handles posting boosts to Nostr

// WebSocket polyfill for Node.js
const WebSocket = require('ws');
global.WebSocket = WebSocket;

const { finalizeEvent, nip19 } = require('nostr-tools');
const { Relay } = require('nostr-tools');
const { logger } = require('./logger.js');

// Helipad webhook event structure
// This is what we receive from Helipad when someone sends a boost
const HelipadPaymentEvent = {
  // Example structure (not used, just for reference):
  // index: 123,
  // time: 1234567890,
  // value_msat: 1000000,
  // value_msat_total: 1000000,
  // action: 2, // 2 = boost, 1 = stream, etc.
  // sender: "user123",
  // app: "helipad",
  // message: "Great episode!",
  // podcast: "My Podcast",
  // episode: "Episode 1",
  // tlv: "..."
};

class NostrBot {
  constructor(nsec, relays = [
    'wss://relay.damus.io',
    'wss://relay.nostr.band', 
    'wss://relay.primal.net',
    'wss://nos.lol',
    'wss://relay.snort.social'
  ]) {
    this.nsec = nsec;
    this.relays = relays;
  }

  // Convert nsec (private key) to the format nostr-tools needs
  getSecretKey() {
    try {
      const { data } = nip19.decode(this.nsec);
      return data;
    } catch (error) {
      throw new Error('Invalid nsec format - check your NOSTR_BOOST_BOT_NSEC');
    }
  }

  // Post to multiple Nostr relays
  async publishToRelays(event) {
    // Test mode - just log what would be posted without actually posting
    if (process.env.TEST_MODE === 'true') {
      logger.info('TEST MODE - Would post to Nostr:', { 
        content: event.content,
        tags: event.tags,
        relays: this.relays 
      });
      return;
    }

    logger.info(`Posting to ${this.relays.length} Nostr relays...`);
    
    // Try to post to each relay
    const results = await Promise.allSettled(
      this.relays.map(async (relayUrl) => {
        try {
          logger.debug(`Connecting to ${relayUrl}`);
          const relay = await Relay.connect(relayUrl);
          logger.debug(`Posting to ${relayUrl}`);
          await relay.publish(event);
          relay.close();
          logger.info(`✅ Posted to ${relayUrl}`);
          return true; // Success
        } catch (error) {
          logger.error(`❌ Failed to post to ${relayUrl}:`, error.message);
          return false; // Failure
        }
      })
    );

    // Count successes and failures
    const successful = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
    const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && r.value === false)).length;
    
    logger.info(`📊 Posted to ${successful} relays, failed on ${failed} relays`);
  }

  // Create and post a boost message to Nostr
  async postBoostToNostr(event) {
    const secretKey = this.getSecretKey();
    const satsAmount = Math.floor(event.value_msat_total / 1000);
    
    // Figure out what type of action this is
    const actionNames = {
      0: 'Error',
      1: 'Stream', 
      2: 'Boost',
      3: 'Unknown',
      4: 'Auto Boost'
    };
    const actionName = actionNames[event.action] || 'Unknown';

    // Build the message that will be posted to Nostr
    let content = `💰 ${actionName}: ${satsAmount} sats`;
    
    // Add sender name if available
    if (event.sender && event.sender !== 'Unknown') {
      content += ` from ${event.sender}`;
    }
    
    // Add podcast name if available
    if (event.podcast) {
      content += ` → ${event.podcast}`;
    }
    
    // Add the boost message if provided
    if (event.message) {
      content += `\n💬 "${event.message}"`;
    }

    // Add hashtags for discoverability
    content += `\n\n#NostrBoostBot #Bitcoin #Lightning #Nostr #Podcast`;

    // Create the Nostr event
    const nostrEvent = finalizeEvent({
      kind: 1, // Kind 1 = text note
      content: content,
      tags: [
        ['t', 'nostrboostbot'],
        ['t', 'bitcoin'],
        ['t', 'lightning'],
        ['t', 'podcast'],
        ['t', actionName.toLowerCase()],
      ],
      created_at: Math.floor(Date.now() / 1000),
    }, secretKey);

    // Post to Nostr
    await this.publishToRelays(nostrEvent);
  }
}

// Create a Nostr bot instance
function createNostrBot() {
  const nsec = process.env.NOSTR_BOOST_BOT_NSEC;
  if (!nsec) {
    logger.warn('⚠️  NOSTR_BOOST_BOT_NSEC not set - Nostr posting disabled');
    return null;
  }
  
  try {
    return new NostrBot(nsec);
  } catch (error) {
    logger.error('❌ Failed to create Nostr bot:', error.message);
    return null;
  }
}

// Main function to announce a Helipad payment to Nostr
async function announceHelipadPayment(event) {
  const bot = createNostrBot();
  if (!bot) {
    logger.warn('⚠️  Nostr bot not available - skipping post');
    return;
  }

  try {
    await bot.postBoostToNostr(event);
    logger.info('✅ Successfully posted boost to Nostr');
  } catch (error) {
    logger.error('❌ Failed to post boost to Nostr:', error.message);
  }
}

// Export the main function
module.exports = { announceHelipadPayment }; 