// Simplified Nostr bot for BoostBot Starter
import WebSocket from 'ws';
// @ts-ignore
global.WebSocket = WebSocket;

import { finalizeEvent, nip19 } from 'nostr-tools';
import { Relay } from 'nostr-tools';
import { logger } from './logger.js';

// Helipad webhook event interface
export interface HelipadPaymentEvent {
  index: number;
  time: number;
  value_msat: number;
  value_msat_total: number;
  action: number;
  sender: string;
  app: string;
  message: string;
  podcast: string;
  episode: string;
  tlv: string;
  remote_podcast?: string;
  remote_episode?: string;
  reply_sent?: boolean;
  payment_info?: {
    payment_hash: string;
    pubkey: string;
    custom_key: number;
    custom_value: string;
    fee_msat: number;
    reply_to_idx: number | null;
  } | null;
}

class NostrBot {
  private nsec: string;
  private relays: string[];

  constructor(nsec: string, relays: string[] = [
    'wss://relay.damus.io',
    'wss://relay.nostr.band',
    'wss://relay.primal.net',
    'wss://nos.lol',
    'wss://relay.snort.social'
  ]) {
    this.nsec = nsec;
    this.relays = relays;
  }

  public getSecretKey(): Uint8Array {
    try {
      const { data } = nip19.decode(this.nsec);
      return data as Uint8Array;
    } catch {
      throw new Error('Invalid nsec format');
    }
  }

  public async publishToRelays(event: ReturnType<typeof finalizeEvent>): Promise<void> {
    // Test mode - just log what would be posted without actually posting
    if (process.env.TEST_MODE === 'true') {
      logger.info('TEST MODE - Would post to relays', { 
        content: event.content,
        tags: event.tags,
        relays: this.relays 
      } as any);
      return;
    }

    logger.info(`Attempting to publish to ${this.relays.length} relays`);
    
    const publishPromises = this.relays.map(async (relayUrl) => {
      try {
        logger.debug(`Connecting to ${relayUrl}`);
        const relay = await Relay.connect(relayUrl);
        logger.debug(`Publishing to ${relayUrl}`);
        await relay.publish(event);
        relay.close();
        logger.info(`Successfully published to ${relayUrl}`);
        return true; // Success
      } catch (error) {
        logger.error(
          `Failed to publish to ${relayUrl}`,
          (error instanceof Error
            ? { error: error.message, stack: error.stack }
            : { error: String(error) }) as any
        );
        return false; // Failure
      }
    });

    const results = await Promise.allSettled(publishPromises);
    const successful = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
    const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && r.value === false)).length;
    
    logger.info(`Publish results: ${successful} successful, ${failed} failed out of ${this.relays.length} relays`);
  }

  async postBoostToNostr(event: HelipadPaymentEvent): Promise<void> {
    const sk = this.getSecretKey();
    const satsAmount = Math.floor(event.value_msat_total / 1000);
    
    // Create boost message
    const actionName = {
      0: 'Error',
      1: 'Stream',
      2: 'Boost',
      3: 'Unknown',
      4: 'Auto Boost'
    }[event.action] || 'Unknown';

    let content = `💰 ${actionName}: ${satsAmount} sats`;
    
    if (event.sender && event.sender !== 'Unknown') {
      content += ` from ${event.sender}`;
    }
    
    if (event.podcast) {
      content += ` → ${event.podcast}`;
    }
    
    if (event.message) {
      content += `\n💬 "${event.message}"`;
    }

    content += `\n\n#NostrBoostBot #Bitcoin #Lightning #Nostr #Podcast`;

    const eventToPost = finalizeEvent({
      kind: 1,
      content,
      tags: [
        ['t', 'nostrboostbot'],
        ['t', 'bitcoin'],
        ['t', 'lightning'],
        ['t', 'podcast'],
        ['t', actionName.toLowerCase()],
      ],
      created_at: Math.floor(Date.now() / 1000),
    }, sk);

    await this.publishToRelays(eventToPost);
  }
}

export function createNostrBot(): NostrBot | null {
  const nsec = process.env.NOSTR_BOOST_BOT_NSEC;
  if (!nsec) {
    logger.warn('NOSTR_BOOST_BOT_NSEC not set, Nostr posting disabled');
    return null;
  }
  
  try {
    return new NostrBot(nsec);
  } catch (error) {
    logger.error('Failed to create Nostr bot:', error as any);
    return null;
  }
}

export async function announceHelipadPayment(event: HelipadPaymentEvent): Promise<void> {
  const bot = createNostrBot();
  if (!bot) {
    logger.warn('Nostr bot not available, skipping post');
    return;
  }

  try {
    await bot.postBoostToNostr(event);
    logger.info('Successfully posted boost to Nostr');
  } catch (error) {
    logger.error('Failed to post boost to Nostr:', error as any);
  }
} 