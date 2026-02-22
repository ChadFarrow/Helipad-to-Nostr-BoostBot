// Server-side only - Nostr bot for posting fundraiser updates
// NOTE: This will only work if you deploy to a server environment (not static hosting)
// For static hosting, you'll need to set up a separate server/API for bot posting

// WebSocket polyfill for Node.js
import WebSocket from 'ws';
globalThis.WebSocket = WebSocket as any;

import { finalizeEvent, nip19, getPublicKey } from 'nostr-tools';
import { Relay } from 'nostr-tools/relay';
import { promises as fs } from 'fs';
import path from 'path';
import { logger } from './logger.js';
import crypto from 'crypto';

// Podcast Index API helper function to look up podcast feedID by GUID
async function lookupFeedIdByGuid(guid: string): Promise<number | null> {
  const apiKey = process.env.PODCAST_INDEX_API_KEY;
  const apiSecret = process.env.PODCAST_INDEX_API_SECRET;

  if (!apiKey || !apiSecret) {
    logger.warn('Podcast Index API credentials not configured');
    return null;
  }

  try {
    const apiTime = Math.floor(Date.now() / 1000);
    const hash = crypto.createHash('sha1')
      .update(apiKey + apiSecret + apiTime)
      .digest('hex');

    const url = `https://api.podcastindex.org/api/1.0/podcasts/byguid?guid=${encodeURIComponent(guid)}`;
    logger.info(`🔍 Looking up feedID for GUID: ${guid}`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'BoostBot/1.0',
        'X-Auth-Date': apiTime.toString(),
        'X-Auth-Key': apiKey,
        'Authorization': hash
      }
    });

    if (!response.ok) {
      logger.warn(`Podcast Index API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json() as any;

    if (data.status === 'true' && data.feed && data.feed.id) {
      logger.info(`✅ Found feedID ${data.feed.id} for GUID ${guid}`);
      return data.feed.id;
    }

    logger.warn(`No podcast found for GUID: ${guid}`);
    return null;
  } catch (error: any) {
    logger.error('Error looking up feedID by GUID', {
      error: error?.message,
      guid
    });
    return null;
  }
}

// Podcast Index API helper function
async function lookupTrackNameByGUID(
  guid: string,
  feedId?: number,
  podcastGuid?: string
): Promise<string | null> {
  const apiKey = process.env.PODCAST_INDEX_API_KEY;
  const apiSecret = process.env.PODCAST_INDEX_API_SECRET;

  if (!apiKey || !apiSecret) {
    logger.warn('Podcast Index API credentials not configured');
    return null;
  }

  try {
    const apiTime = Math.floor(Date.now() / 1000);
    const hash = crypto.createHash('sha1')
      .update(apiKey + apiSecret + apiTime)
      .digest('hex');

    // Build URL with either feedid or podcastguid
    let url: string;
    if (podcastGuid) {
      url = `https://api.podcastindex.org/api/1.0/episodes/byguid?guid=${encodeURIComponent(guid)}&podcastguid=${encodeURIComponent(podcastGuid)}`;
      logger.info(`🔍 Looking up track name: ${guid} (podcastGuid: ${podcastGuid})`);
    } else if (feedId) {
      url = `https://api.podcastindex.org/api/1.0/episodes/byguid?guid=${encodeURIComponent(guid)}&feedid=${feedId}`;
      logger.info(`🔍 Looking up track name: ${guid} (feedId: ${feedId})`);
    } else {
      logger.warn('No feedId or podcastGuid provided for lookup');
      return null;
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'BoostBot/1.0',
        'X-Auth-Date': apiTime.toString(),
        'X-Auth-Key': apiKey,
        'Authorization': hash
      }
    });

    if (!response.ok) {
      logger.warn(`Podcast Index API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json() as any;

    if (data.status === 'true' && data.episode && data.episode.title) {
      logger.info(`✅ Found track name: ${data.episode.title}`);
      return data.episode.title;
    }

    logger.warn(`No episode found for GUID: ${guid}`);
    return null;
  } catch (error: any) {
    logger.error('Error looking up track name', {
      error: error?.message,
      guid,
      feedId,
      podcastGuid
    });
    return null;
  }
}

interface FundraiserUpdateOptions {
  title: string;
  creator: string;
  amount?: number;
  endDate?: number;
  ticketPrice?: number;
  description?: string;
  url?: string;
}

interface WinnerAnnouncementOptions {
  title: string;
  creator: string;
  winner: string;
  prizeAmount: number;
  totalRaised: number;
  url?: string;
}

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

  constructor(nsec: string, relays: string[] = ['wss://relay.damus.io', 'wss://relay.nostr.band', 'wss://relay.primal.net', 'wss://7srr7chyc6vlhzpc2hl6lyungvluohzrmt76kbs4kmydhrxoakkbquad.local/', 'wss://chadf.nostr1.com/']) {
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

  public getRelays(): string[] {
    return this.relays;
  }

  public async publishToRelays(event: ReturnType<typeof finalizeEvent>): Promise<void> {
    // Test mode - just log what would be posted without actually posting
    if (process.env.TEST_MODE === 'true') {
      logger.info('TEST MODE - Would post to relays', { 
        content: event.content,
        tags: event.tags,
        relays: this.relays 
      });
      return;
    }

    logger.info(`Attempting to publish to ${this.relays.length} relays`, { content: event.content });
    
    const publishPromises = this.relays.map(async (relayUrl) => {
      try {
        logger.debug(`Connecting to ${relayUrl}`);
        
        // Add timeout wrapper for relay operations with retry
        let lastError;
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            const timeoutPromise = new Promise((_, reject) => {
              setTimeout(() => reject(new Error('connection timed out')), 30000); // 30 second timeout
            });
            
            const relayPromise = (async () => {
              const relay = await Relay.connect(relayUrl);
              logger.debug(`Publishing to ${relayUrl} (attempt ${attempt})`);
              await relay.publish(event);
              relay.close();
              return true;
            })();
            
            await Promise.race([relayPromise, timeoutPromise]);
            break; // Success, exit retry loop
          } catch (error) {
            lastError = error;
            if (attempt === 1) {
              logger.debug(`First attempt failed for ${relayUrl}, retrying...`);
              await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay before retry
            }
          }
        }
        
        if (lastError) {
          throw lastError;
        }
        logger.info(`Successfully published to ${relayUrl}`);
      } catch (error) {
        logger.error(`Failed to publish to ${relayUrl}`, { error: error?.message || error });
      }
    });

    const results = await Promise.allSettled(publishPromises);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    logger.info(`Publish results: ${successful} successful, ${failed} failed out of ${this.relays.length} relays`);
  }

  async postFundraiserCreated(options: FundraiserUpdateOptions): Promise<void> {
    const sk = this.getSecretKey();
    
    const content = `🎉 New Fundraiser Created!

🎧 ${options.title}
👤 Creator: ${options.creator}
${options.ticketPrice ? `🎫 Ticket Price: ${options.ticketPrice} sats` : ''}
${options.amount ? `🎯 Target: ${options.amount} sats` : ''}
${options.endDate ? `⏰ Ends: ${new Date(options.endDate * 1000).toLocaleDateString()}` : ''}

${options.description || ''}

${options.url ? `Join: ${options.url}` : ''}

#NostrBoostBot #Bitcoin #Lightning #Nostr #Podcast`;

    const event = finalizeEvent({
      kind: 1,
      content,
      tags: [
        ['t', 'nostrboostbot'],
        ['t', 'bitcoin'],
        ['t', 'lightning'],
        ['t', 'podcast'],
        ['t', 'fundraiser'],
      ],
      created_at: Math.floor(Date.now() / 1000),
    }, sk);

    await this.publishToRelays(event);
  }

  async postWinnerAnnouncement(options: WinnerAnnouncementOptions): Promise<void> {
    const sk = this.getSecretKey();
    
    const content = `🏆 Winner Announced!

🎧 ${options.title}
👤 Creator: ${options.creator}
🎉 Winner: ${options.winner}
💰 Prize: ${options.prizeAmount} sats
📊 Total Raised: ${options.totalRaised} sats

Congratulations to the winner! 🎉

${options.url ? `View: ${options.url}` : ''}

#NostrBoostBot #Bitcoin #Lightning #Winner #Podcast`;

    const event = finalizeEvent({
      kind: 1,
      content,
      tags: [
        ['t', 'nostrboostbot'],
        ['t', 'bitcoin'],
        ['t', 'lightning'],
        ['t', 'podcast'],
        ['t', 'winner'],
      ],
      created_at: Math.floor(Date.now() / 1000),
    }, sk);

    await this.publishToRelays(event);
  }

  async postFundraiserEnded(options: FundraiserUpdateOptions & { totalRaised: number }): Promise<void> {
    const sk = this.getSecretKey();
    
    const content = `⏰ Fundraiser Ended

🎧 ${options.title}
👤 Creator: ${options.creator}
💰 Total Raised: ${options.totalRaised} sats
🎯 Drawing winner soon...

${options.url ? `View: ${options.url}` : ''}

#NostrBoostBot #Bitcoin #Lightning #Podcast`;

    const event = finalizeEvent({
      kind: 1,
      content,
      tags: [
        ['t', 'nostrboostbot'],
        ['t', 'bitcoin'],
        ['t', 'lightning'],
        ['t', 'podcast'],
        ['t', 'ended'],
      ],
      created_at: Math.floor(Date.now() / 1000),
    }, sk);

    await this.publishToRelays(event);
  }
}

// Server-side only function to get bot instance
export function createNostrBot(): NostrBot | null {
  const botNsec = process.env.NOSTR_BOOST_BOT_NSEC;
  
  if (!botNsec) {
    console.warn('NOSTR_BOOST_BOT_NSEC environment variable not set');
    return null;
  }

  return new NostrBot(botNsec);
}

// Helper functions for easy use
export async function announceFundraiserCreated(options: FundraiserUpdateOptions): Promise<void> {
  const bot = createNostrBot();
  if (bot) {
    await bot.postFundraiserCreated(options);
  }
}

export async function announceWinner(options: WinnerAnnouncementOptions): Promise<void> {
  const bot = createNostrBot();
  if (bot) {
    await bot.postWinnerAnnouncement(options);
  }
}

export async function announceFundraiserEnded(options: FundraiserUpdateOptions & { totalRaised: number }): Promise<void> {
  const bot = createNostrBot();
  if (bot) {
    await bot.postFundraiserEnded(options);
  }
}

// Cache to track boost sessions and find the largest split
const boostSessions = new Map<string, { largestSplit: HelipadPaymentEvent, allSplits: HelipadPaymentEvent[], timeout: NodeJS.Timeout }>();
const postedBoosts = new Set<string>();

// Track recent boost post contents to prevent duplicates
interface RecentBoostPost {
  content: string;
  timestamp: number;
  sessionId: string;
}
const recentBoostPosts: RecentBoostPost[] = [];
const MAX_RECENT_POSTS = 5; // Keep last 5 posts for duplicate checking

// Function to check if content is similar to recent posts
function isDuplicateContent(content: string, sessionId: string): boolean {
  const now = Date.now();
  const fiveMinutesAgo = now - (5 * 60 * 1000); // 5 minutes
  
  // Remove old posts (older than 5 minutes)
  while (recentBoostPosts.length > 0 && recentBoostPosts[0].timestamp < fiveMinutesAgo) {
    recentBoostPosts.shift();
  }
  
  // Check last 2 posts for similarity (as requested)
  const recentPosts = recentBoostPosts.slice(-2);
  
  for (const post of recentPosts) {
    // Skip if it's the same session (already handled by postedBoosts)
    if (post.sessionId === sessionId) {
      continue;
    }
    
    // Check if content is very similar (allowing for minor differences)
    const similarity = calculateContentSimilarity(content, post.content);
    if (similarity > 0.9) { // 90% similarity threshold
      logger.info(`Duplicate content detected (${Math.round(similarity * 100)}% similarity)`, {
        currentSession: sessionId,
        previousSession: post.sessionId,
        similarity: similarity
      });
      return true;
    }
  }
  
  return false;
}

// Simple similarity calculation based on common words and structure
function calculateContentSimilarity(content1: string, content2: string): number {
  // Normalize content by removing extra whitespace and converting to lowercase
  const normalize = (str: string) => str.toLowerCase().replace(/\s+/g, ' ').trim();
  const norm1 = normalize(content1);
  const norm2 = normalize(content2);
  
  // If they're exactly the same, return 1.0
  if (norm1 === norm2) {
    return 1.0;
  }
  
  // Split into words and find common words
  const words1 = norm1.split(' ');
  const words2 = norm2.split(' ');
  const set1 = new Set(words1);
  const set2 = new Set(words2);
  
  // Count common words
  let commonWords = 0;
  for (const word of set1) {
    if (set2.has(word)) {
      commonWords++;
    }
  }
  
  // Calculate Jaccard similarity
  const union = set1.size + set2.size - commonWords;
  if (union === 0) return 0;
  
  return commonWords / union;
}

// Function to add a post to recent posts tracking
function addToRecentPosts(content: string, sessionId: string): void {
  const now = Date.now();
  
  // Add new post
  recentBoostPosts.push({
    content,
    timestamp: now,
    sessionId
  });
  
  // Keep only the most recent posts
  while (recentBoostPosts.length > MAX_RECENT_POSTS) {
    recentBoostPosts.shift();
  }
  
  logger.info(`Added post to recent tracking`, {
    sessionId,
    totalRecentPosts: recentBoostPosts.length
  });
}

// Interface for persisting session data
interface PersistedSession {
  sessionId: string;
  largestSplit: HelipadPaymentEvent;
  allSplits: HelipadPaymentEvent[];
  expiresAt: number; // timestamp when session should timeout
}

// File path for persisting boost sessions
const BOOST_SESSIONS_FILE = path.join(process.cwd(), 'boost-sessions.json');

// Load boost sessions from file
async function loadBoostSessions(): Promise<void> {
  try {
    const data = await fs.readFile(BOOST_SESSIONS_FILE, 'utf-8');
    const savedSessions: PersistedSession[] = JSON.parse(data);
    const now = Date.now();
    let loadedCount = 0;
    let expiredCount = 0;
    
    savedSessions.forEach(session => {
      if (session.expiresAt > now) {
        // Session hasn't expired, restore it with new timeout
        const timeLeft = session.expiresAt - now;
        const timeout = setTimeout(async () => {
          logger.info(`Posting delayed session ${session.sessionId} after restart`, { 
            amount: session.largestSplit.value_msat / 1000, 
            total: session.largestSplit.value_msat_total / 1000 
          });
          
          const bot = createNostrBot();
          if (bot) {
            postedBoosts.add(session.sessionId);
            boostSessions.delete(session.sessionId);
            try {
              await postBoostToNostr(session.largestSplit, bot, session.sessionId, session.allSplits);
            } catch (error) {
              logger.error('Error in postBoostToNostr during session restoration', {
                error: error.message,
                stack: error.stack,
                session: session.sessionId,
                amount: session.largestSplit.value_msat_total / 1000
              });
            }
            await saveBoostSessions(); // Clean up file
          }
        }, timeLeft);
        
        boostSessions.set(session.sessionId, {
          largestSplit: session.largestSplit,
          allSplits: session.allSplits || [session.largestSplit],
          timeout
        });
        loadedCount++;
      } else {
        expiredCount++;
      }
    });
    
    if (loadedCount > 0 || expiredCount > 0) {
      logger.info(`📦 Loaded boost sessions: ${loadedCount} active, ${expiredCount} expired`);
      if (loadedCount > 0) {
        await saveBoostSessions(); // Remove expired sessions from file
      }
    }
  } catch (error) {
    logger.info(`📦 No previous boost sessions found`);
  }
}

// Save boost sessions to file
async function saveBoostSessions(): Promise<void> {
  try {
    const now = Date.now();
    const sessionsToSave: PersistedSession[] = [];
    
    boostSessions.forEach((session, sessionId) => {
      // Only save sessions that haven't been posted yet
      if (!postedBoosts.has(sessionId)) {
        sessionsToSave.push({
          sessionId,
          largestSplit: session.largestSplit,
          allSplits: session.allSplits,
          expiresAt: now + 30000 // Current time + 30 seconds
        });
      }
    });
    
    await fs.writeFile(BOOST_SESSIONS_FILE, JSON.stringify(sessionsToSave, null, 2));
  } catch (error) {
    logger.error(`❌ Failed to save boost sessions:`, error);
  }
}

export async function announceHelipadPayment(event: HelipadPaymentEvent): Promise<void> {
  const bot = createNostrBot();
  if (!bot) return;

  // Debug: Log all payment details to understand the data
  logger.info(`Payment received`, { 
    action: event.action, 
    amount: event.value_msat / 1000, 
    total: event.value_msat_total / 1000, 
    message: event.message || 'none',
    sender: event.sender,
    podcast: event.podcast,
    episode: event.episode
  });
  
  // Load boost sessions on first run
  if (boostSessions.size === 0 && postedBoosts.size === 0) {
    await loadBoostSessions();
  }

  // Only continue with individual boost posts for action === 2 (boosts)
  if (event.action !== 2) {
    return; // Skip individual posts for streams
  }

  // Only post boosts from ChadF to avoid posting pseudonymous boosts
  if (event.sender?.trim() !== 'ChadF') {
    logger.info(`Skipping boost from different sender`, {
      sender: event.sender,
      amount: event.value_msat_total / 1000
    });
    return; // Skip boosts not from ChadF
  }

  // Skip StableKraft Metaboost platform fee events
  const tlvString = event.tlv || '';
  const isMetaboost = tlvString.includes('"metaboost-"') ||
                      event.message?.toLowerCase().includes('metaboost') ||
                      (event.message?.toLowerCase().includes('platform fee') && event.app?.toLowerCase() === 'stablekraft');
  if (isMetaboost) {
    logger.info(`Skipping StableKraft Metaboost`, {
      message: event.message,
      amount: event.value_msat_total / 1000
    });
    return;
  }

  // Group splits by a wider time window to catch all splits from the same boost
  const timeWindow = Math.floor(event.time / 120); // 2-minute windows to prevent split sessions
  const sessionId = `${timeWindow}-${event.sender}-${event.episode}-${event.podcast}`;

  logger.info(`Processing payment`, {
    amount: event.value_msat / 1000,
    total: event.value_msat_total / 1000,
    session: sessionId,
    hasFee: !!event.payment_info?.fee_msat,
    feeAmount: event.payment_info?.fee_msat || 0
  });

  // Check if we already posted for this boost session
  if (postedBoosts.has(sessionId)) {
    logger.info(`Already posted for boost session ${sessionId}, skipping`);
    return;
  }

  // Determine if this split has fees (indicates it was sent, not received)
  const hasFees = event.payment_info && event.payment_info.fee_msat && event.payment_info.fee_msat > 0;

  // Get or create session entry
  const existingSession = boostSessions.get(sessionId);

  if (existingSession) {
    // Clear the previous timeout if this split has fees
    if (hasFees) {
      clearTimeout(existingSession.timeout);
    }

    // Add this split to the collection
    existingSession.allSplits.push(event);

    // Update if this split is larger
    if (event.value_msat > existingSession.largestSplit.value_msat) {
      existingSession.largestSplit = event;
      logger.info(`Updated largest split for session ${sessionId}`, {
        amount: event.value_msat / 1000,
        total: event.value_msat_total / 1000,
        hasFees
      });
    } else {
      logger.info(`Keeping existing largest split for session ${sessionId}`, {
        amount: existingSession.largestSplit.value_msat / 1000,
        addedSplitHasFees: hasFees
      });
    }
  } else {
    // First split for this session
    boostSessions.set(sessionId, { largestSplit: event, allSplits: [event], timeout: setTimeout(() => {}, 0) });
    logger.info(`New boost session ${sessionId}`, {
      amount: event.value_msat / 1000,
      total: event.value_msat_total / 1000,
      hasFees
    });
  }

  // Only set timeout to post if this split has fees (indicates sent boost)
  // Splits without fees are still collected but don't trigger posting
  if (hasFees) {
    const session = boostSessions.get(sessionId)!;
    session.timeout = setTimeout(async () => {
      logger.info(`Posting boost for session ${sessionId} with ${session.allSplits.length} splits`, {
        amount: session.largestSplit.value_msat / 1000,
        total: session.largestSplit.value_msat_total / 1000
      });

      // Mark this session as posted
      postedBoosts.add(sessionId);
      const allSplits = session.allSplits;
      boostSessions.delete(sessionId);

      // Post the largest payment from this session, passing all splits for metadata collection
      try {
        await postBoostToNostr(session.largestSplit, bot, sessionId, allSplits);
      } catch (error) {
        logger.error('Error in postBoostToNostr', {
          error: error.message,
          stack: error.stack,
          session: sessionId,
          amount: session.largestSplit.value_msat_total / 1000
        });
      }
      await saveBoostSessions(); // Clean up persisted sessions
    }, 30000);

    // Save sessions to disk after any changes
    await saveBoostSessions();
  } else {
    logger.info(`Split without fees added to session ${sessionId}, waiting for fee-bearing split to trigger post`);
  }
}

// Mapping of show names to npubs for automatic tagging
const showToNpubMap: Record<string, string[]> = {
  // Show name -> array of npubs to tag
  'Lightning Thrashes': [
    'npub15z2javq62eh2xpms7yew0uzqsk4dr7t3q3dq4903uuxdyw2ca3kstx6q95', // sir libre
  ],
  'bitpunk.fm unwound': [
    'npub1f49twdlzlw667r74jz6t06xxlemd8gp2j7g77l76easpl8jsltvqvlzpez', // bitpunk_fm
  ],
  'bitpunk_fm radio': [
    'npub1f49twdlzlw667r74jz6t06xxlemd8gp2j7g77l76easpl8jsltvqvlzpez', // bitpunk_fm
  ],
  'bitpunk_fm live': [
    'npub1f49twdlzlw667r74jz6t06xxlemd8gp2j7g77l76easpl8jsltvqvlzpez', // bitpunk_fm
  ],
  'poetry on tape': [
    'npub1f49twdlzlw667r74jz6t06xxlemd8gp2j7g77l76easpl8jsltvqvlzpez', // bitpunk_fm
  ],
  'Sats and Sounds': [
    'npub15zt29ma0q2je90u6tzjse4q9md4jn84x44uwze0mj03uvrd2puksq8w9sh', // Kevin Bae
  ],
  'Ungovernable Misfits': [
    'npub1lqvv69u549atefvcyfht30lemlyvl9jnz4l7c6ejs20yzpq7hh7sjjfx0r', // Max
  ],
  'UpBEATS': [
    'npub1nnkhv7scg4zxr9t6sgukyxn923ed6485ud8m7a3lurr4qd4lhv7qhrp49m', // UpBEATs
  ],
  'No Solutions': [
    'npub1dergggklka99wwrs92yz8wdjs952h2ux2ha2ed598ngwu9w7a6fsh9xzpc', // Gigi
  ],
  'Into The Doerfel-Verse': [
    'npub14c7ksq2wln0s9nftjlr0wv2vqpg5xzvw7jezl3whczc0ff2y97eqerl5l2', // The Doerfels
  ],
  "Mike's Mix Tape": [
    'npub1uqwyafrvsf9z8tyn8gtk40au72znradyla29852uvmdl6lnpz8nsyz43la', // Mike Neumann
  ],
  'Homegrown Hits': [
    'npub19ha7tju4teqp3dmwv4p28wrcy9zd6h6hxkg5mwvjrlfycweazpkse2q0fa', // DuhLaurien
    'npub1ujt5f2qj0nave2m9t0s8jxlwufn8msc0hf62zlql0rd9247yuzwqtzmsud', // MaryKateUltra
  ],
  'Bowl After Bowl': [
    'npub1yvscx9vrmpcmwcmydrm8lauqdpngum4ne8xmkgc2d4rcaxrx7tkswdwzdu', // Sir Spencer
    'npub19ha7tju4teqp3dmwv4p28wrcy9zd6h6hxkg5mwvjrlfycweazpkse2q0fa', // DuhLaurien
  ],
  "It's A Mood": [
    'npub1uqwyafrvsf9z8tyn8gtk40au72znradyla29852uvmdl6lnpz8nsyz43la', // Mike Neumann
  ],
  'Spectral Hiding': [
    'npub1f49twdlzlw667r74jz6t06xxlemd8gp2j7g77l76easpl8jsltvqvlzpez', // bitpunk_fm
  ],
  'Behind the Sch3m3s': [
    'npub1scsqgzjfst9czlqmxf332thu54h2tx6ssnyk9wtapme0jf2w9e6qhuekhy', // boobury
    'npub1g5w8td47hlh5guqp53235r0dgpqhpxmjn7nj2tmsk94r0yp9ehksn7llc8', // Lavish
  ],
  'Thunder Road Media': [
    'npub1scsqgzjfst9czlqmxf332thu54h2tx6ssnyk9wtapme0jf2w9e6qhuekhy', // boobury
  ],
  'Radio bitpunk.fm': [
    'npub1f49twdlzlw667r74jz6t06xxlemd8gp2j7g77l76easpl8jsltvqvlzpez', // bitpunk_fm
  ],
  'Monero Monthly': [
    'npub1tr4dstaptd2sp98h7hlysp8qle6mw7wmauhfkgz3rmxdd8ndprusnw2y5g', // Seth for Privacy
  ],
  'The HeyCitizen Experience': [
    'npub109pc6vlklws9k5f8vahq2yrdgap7uyqyt7zqknetd5tjzche8t2qvr5aaj', // Heycitizen
  ],
  'AMERICAPLUS': [
    'npub10uny07qd2l25adka6rve92t40g6pa4ya6sr5e3u0cqwaagg2rtvswtmwyn', // Cole
  ],
  // Add more shows and their associated npubs
};

// Mapping of names to npubs for auto-tagging in boost messages
const nameToNpubMap: Record<string, string> = {
  // Add display names for people you want to auto-tag in boosts
  // Format: 'display name': 'npub...',
  
  // Common PC2.0 & No Agenda figures (verified npubs):
  'chadf': 'npub177fz5zkm87jdmf0we2nz7mm7uc2e7l64uzqrv6rvdrsg8qkrg7yqx0aaq7',
  'dave jones': 'npub1yz4ld4q0j0zy4mxcyxn5frtu3yzk0grhzlstmmm2uh6qn8w72zgsq3r5ww',
  'oscar merry': 'npub1mz8yw99yz2k8qjt3e4k3ek74sz8v8gqhtyxe6upmg8v82fhq4xkqazt7u7',
  'heycitizen': 'npub109pc6vlklws9k5f8vahq2yrdgap7uyqyt7zqknetd5tjzche8t2qvr5aaj',
  'natejohnivan': 'npub1zxdp7ug6alran2h3wmgdhkly6tg5ngxg3k6tgfsy3xn7taelerhqke4hr0',
  'jack phemister': 'npub1v95n3s2z3gjcvsv3kf4nhqq7p7vkphepsrez5j6q5suncxztt6esd46gnv',
  'the trusted': 'npub1wzvnx7q978657y38jtyla09wt84mk764qnwt3uu8llrtlk32pdyqea3tv2',
  'the budtender': 'npub12q9x4g8kkw5hj47a0f3e39jlxarfp8h6atasvr7fc8ks0j3f3ctq0870wm',
  'budtender': 'npub12q9x4g8kkw5hj47a0f3e39jlxarfp8h6atasvr7fc8ks0j3f3ctq0870wm',
  'bitpunk_fm': 'npub1f49twdlzlw667r74jz6t06xxlemd8gp2j7g77l76easpl8jsltvqvlzpez',
  'openmike': 'npub1a6c3jcdj23ptzcuflek8a04f4hc2cdkat95pd6n3r8jjrwyzrw0q43lfrr',
  'sirlibre': 'npub15z2javq62eh2xpms7yew0uzqsk4dr7t3q3dq4903uuxdyw2ca3kstx6q95',
  'sir libre': 'npub15z2javq62eh2xpms7yew0uzqsk4dr7t3q3dq4903uuxdyw2ca3kstx6q95',
  'kolomona': 'npub15z2javq62eh2xpms7yew0uzqsk4dr7t3q3dq4903uuxdyw2ca3kstx6q95',
  'duhlaurien': 'npub19ha7tju4teqp3dmwv4p28wrcy9zd6h6hxkg5mwvjrlfycweazpkse2q0fa',
  'cbrooklyn': 'npub1lt0pv5fpfa0n8uuxpxa8fzc7nv3he0jp7tnzy9zu7rur69ejr3nqu03txv',
  'boolysteed': 'npub1scsqgzjfst9czlqmxf332thu54h2tx6ssnyk9wtapme0jf2w9e6qhuekhy',
  'marykateultra': 'npub1ujt5f2qj0nave2m9t0s8jxlwufn8msc0hf62zlql0rd9247yuzwqtzmsud',
  'lavish': 'npub1g5w8td47hlh5guqp53235r0dgpqhpxmjn7nj2tmsk94r0yp9ehksn7llc8',
  'upbeats': 'npub1nnkhv7scg4zxr9t6sgukyxn923ed6485ud8m7a3lurr4qd4lhv7qhrp49m',
  'saltycrayon': 'npub1nnkhv7scg4zxr9t6sgukyxn923ed6485ud8m7a3lurr4qd4lhv7qhrp49m',
  'gigi': 'npub1dergggklka99wwrs92yz8wdjs952h2ux2ha2ed598ngwu9w7a6fsh9xzpc',
  'thedoerfels': 'npub14c7ksq2wln0s9nftjlr0wv2vqpg5xzvw7jezl3whczc0ff2y97eqerl5l2',
  'sirtj': 'npub14c7ksq2wln0s9nftjlr0wv2vqpg5xzvw7jezl3whczc0ff2y97eqerl5l2',
  'wrathfult': 'npub14c7ksq2wln0s9nftjlr0wv2vqpg5xzvw7jezl3whczc0ff2y97eqerl5l2',
  'zeus': 'npub1xnf02f60r9v0e5kty33a404dm79zr7z2eepyrk5gsq3m7pwvsz2sazlpr5',
  'my frined jimi': 'npub16c94ez2d7qtrexemrtzw387ff0akmarnm08l3sp46uul865tedvsjtt64t',
  'mikeneumann': 'npub1uqwyafrvsf9z8tyn8gtk40au72znradyla29852uvmdl6lnpz8nsyz43la',
  'its a mood': 'npub1uqwyafrvsf9z8tyn8gtk40au72znradyla29852uvmdl6lnpz8nsyz43la',
  'ugm': 'npub1jcympy69pht7ptan39se4nd09e4q66qhey649uu3rczm2zh88c7s0n2890',
  'stevenb': 'npub1yvgrrzf4dnmu30qfhw95x87ruu0g2kpv3a64h8hpvqsre8qeuspsgd6pv9',
  'nmnu': 'npub1ztzpz9xepmxsry7jqdhjc32dh5wtktpnn9kjq5eupdwdq06gdn6s0d7zxv',
  'sirspencer': 'npub1yvscx9vrmpcmwcmydrm8lauqdpngum4ne8xmkgc2d4rcaxrx7tkswdwzdu',
  'sir spencer': 'npub1yvscx9vrmpcmwcmydrm8lauqdpngum4ne8xmkgc2d4rcaxrx7tkswdwzdu',
  'ericpp': 'npub1gfh3zdy07r37mgk4hyr0njmajapswk4ct6anc9w407uqkn39aslqqkalqc',
  'qna': 'npub15c88nc8d44gsp4658dnfu5fahswzzu8gaxm5lkuwjud068swdqfspxssvx',
  'jordan': 'npub16djxdyd6tvwhjmq7rv6rphcqlcgcnmyuyv580tw7rry0v440rrcq4ukhtp',
  'max': 'npub1lqvv69u549atefvcyfht30lemlyvl9jnz4l7c6ejs20yzpq7hh7sjjfx0r',
  'kevin bae': 'npub15zt29ma0q2je90u6tzjse4q9md4jn84x44uwze0mj03uvrd2puksq8w9sh',
  'kevinbae': 'npub15zt29ma0q2je90u6tzjse4q9md4jn84x44uwze0mj03uvrd2puksq8w9sh',
  'seth for privacy': 'npub1tr4dstaptd2sp98h7hlysp8qle6mw7wmauhfkgz3rmxdd8ndprusnw2y5g', // Seth for Privacy
  'sethforprivacy': 'npub1tr4dstaptd2sp98h7hlysp8qle6mw7wmauhfkgz3rmxdd8ndprusnw2y5g', // Seth for Privacy
  'cole': 'npub10uny07qd2l25adka6rve92t40g6pa4ya6sr5e3u0cqwaagg2rtvswtmwyn', // Cole (AMERICAPLUS)
  'americaplus': 'npub10uny07qd2l25adka6rve92t40g6pa4ya6sr5e3u0cqwaagg2rtvswtmwyn', // Cole (AMERICAPLUS)
  
  // Your following list - Add names as you mention them:
  // 'name': 'npub1hkxnvny5c7w23y8xg5r8rhq5frqujr2hk4xqy0pv9d6luwt3njpqyxfnyv',
  // 'name': 'npub1xgxuxtxd7elxvhftvr4e0la685l88wxtcnr2vk5fy5hylxvdxaes8hzv7d',
  // etc...
  
  /* Your complete following list (50 npubs extracted from your contact list):
  npub1hkxnvny5c7w23y8xg5r8rhq5frqujr2hk4xqy0pv9d6luwt3njpqyxfnyv
  npub1xgxuxtxd7elxvhftvr4e0la685l88wxtcnr2vk5fy5hylxvdxaes8hzv7d
  npub1pd3j9750w0lvy539sx2j28rkmqur9s6x3kp9fqnxcup7pmp7gr5slqy7zu
  npub105radvlha6s655nnk0eqzmd5wg6rmzshgpcdhq6jwtykyceg8trqy4wcxy
  npub1zx6829akl3e6d4h3denakdwda52669gef2jxpjje5w02lmnla8kqqm6dea
  npub1v6j8scz52jr5dnzxnmx6mxqurmvxqv4exm7zqqsjgl62sxj5h6esu3x08n
  npub14sjqjdkx4m468klmu6y6yjzqt5q9ckrsp8qr9w7ln9mp0xjq2qesxa0fsh
  npub1p22rdjjxp8pdhnyh8cmjwjr4njcu83w5c4kmre64rmdxwlmu2hwq5xkqsm
  npub1qqsghtwj42exc7eevlu6re4dcy7j68afhlyfepj5wz2nm58w6ursm9ssu8
  npub185rlfas85yej5f62jns7wtmz9lt22z6c2ql5sl4qxvllwd2dx5mste94kl
  npub195juzawre662x99jeenwx3mnqjj4g4u2dgj24dfukllpan6uvdkqtl6aw5
  npub1smp9u2dglqn5dwyzm3d3hvgcjrdxlhmjdnwhfdr20jvhwrdkmepqs7mz3v
  npub1awt8q6enw2h84qrd2ppwdfrz70mghdav84vdq3t5dh6mxrtpd5xqgd8krw
  npub1w2vxxeqaftl2y54fj74tnh4jtx2kjmjdyl8crlxw8xl0kllda2yq2v7axj
  npub12q29x0p3kftvaf66xexr93v2ekahmvjfe52t4xquc0wultx7drqq3lqw8c
  npub1u8d6f8p2e6gdj4dykkx89j9kkamywecqf0sxm30qgfj8phje2phqxjp8de
  npub1u0s3dnmwllmd4z639m05vfjxhzkfcmqwpqfhxexeh6d4jw06yzpqv9qyfe
  npub1qxmvp5ym3q4l6y6xfvj5mgk6x5ehdvddj2l4fxvzqs6x6qhx7ysqpz8xzg
  npub1f5jmw0u9alt67l0v4qt005n3ml0xm5aheulezm7ljdaqeu2la27s4ktl7j
  npub1h24y6m33dekqlc78g4p55c70z6me5rwfzze8dwt2gxhs4v3qxqpssa8jg8
  npub185y4nh8vr5t26nva3xfecxvq5434mmrcqnujmfpxl4dcchv6qjwqxs4ewt
  npub1fqhd96k0ej0uzek7wqqzpk2dz9j65k8p84q6wflm8ayhzzf8yg0qc2aur2
  npub1f8elgnhefau5yg4fw4ltuvej6azr34n6fzms6w6h5zme4umrcjnsr6u6vv
  npub1a6m3uyt9dfxgkrrmfetj7mh6wmf0kxnzsltkm9vdw2z389a339qsuzmktu
  npub1sxrv6kxwyjdrh4m0dq0z5pc6qzmd0u4gh7fz04f7cpqmxd3j3rrs53ee3z
  npub1qq669mkeedv2kf7ee8x38yhexlgjc0kvlx2evhfnfdpjv4hqycnqkwrmvw
  npub1qdexxe23gj8edkmjx4nxya6z09aqlf55y4nc6m4xqm0evks3v7nsq9h0sz
  npub1s5y6xe2guhkdvv4fl8qvnxqshu5wrz45w9w32sjxrc2c92v6pchqpwg7f5
  npub158z8a5kew0ejjjmy6h93qa706ecexjm07nzc4n3elqhm85dj0tjqfluwfs
  npub1caq0em5h95h2d2l859qu6kdez5dxgd2qtmwwyfm20xpvr7phks6q62m5d8
  npub1acqus5dxfft4kwh55xr5mjc8lf6g4s6pqk5r6w2gmyuwz0hshdcsyqphga
  npub177fz5zkm87jdmf0we2nz7mm7uc2e7l64uzqrv6rvdrsg8qkrg7yqx0aaq7
  npub18urgl6dxpgnwvc4gh5xnc6vwu3uajlr4sn2d57sxuw9vr75fxg0qsru87t
  npub19kh4um0tt54m5l329segthdm3p33z99r5hjmhfeaj6wjdlrhm85qy4lqhg
  npub1m5g64ne6a0m5c4alyufq6fhk7lx73edytjz5x8xkuwu6s6hxemxq8qjuyx
  npub1sq054nxafge2k3rz6lq8cy44lk95ag55dnm4suqpq5sxrsl8dmpqw8swlg
  npub1lh35xzl5yps5nrmhlqlhwtgl9xkk8ummyhcejz334ft9z4hpxunqxrpmts
  npub10fl5x8dflj5wpkajd4v9rcj2rjd0n4j0gv68p3wxs6vkja2zuxlqpjl7y6
  npub1xqlgdjlumf74r5pkrv2a8qxp5t2ll52dga4rpqqj5qpnjre7u2kq6ze4du
  npub13sngrqkgztr68d7l656d4fc60ge87ljdq00z7dxkh96ra966zy4s6nv7lg
  npub1ltvjhkmnq66z86jllhjc32l39xtjhs60wt9ktrwfzfe0z4wxlxcsxz8v95
  npub100xydwn8vcmvhznh8vtcdewk9h5dpehsnpjrztzc8mc5ma4dlgjsqcavqy
  npub1u5e7je8yk32nkr84z6ahhm5s4e0ve8lkcf2hf4lgktdaz2d8nz2syxcft8
  npub1unw4t4ps0a70qeh4m9akp6guvnf4hzjctawvyxhe8z6ll84z7zynqqxlp6
  npub15mmelu0nar0qqwrrlx9ndrz4jdqnqtde9m5jxfr2ejtqp8adafxq5xjpwj
  npub1m7p6v0exhda7flykdqhxaxjhfgz6k5gkwjj35wx0xqvnjlx3qnxqcwjps5
  npub15lrvnvhcc8emwf06ev42qrvd4xkmzq0ntrm3gaxd6pvy6c43fvkqq8hm9v
  npub1547t5mr6e4gxtdj3u55rj653j9nc03x8p5w9c3dlrfz4du9j5wjqpa3vtn
  npub194z7etpthgf5qx5vkn3q8rq3j4pvy05a5afs8ep2v26r09k7w6ks5ruz0s
  npub1wyqfvktfw5gkcefqpe9mwr255k67gp0t9rdx7k44vuwaxrngvnyqqkz63u
  */
};

// Mapping of podcast app names to their download/website URLs and display names
const podcastAppLinks: Record<string, { url: string; displayName?: string }> = {
  'CurioCaster': { url: 'https://curiocaster.com' },
  'Fountain': { url: 'https://fountain.fm' },
  'Podverse': { url: 'https://podverse.fm' },
  'Castamatic': { url: 'https://castamatic.com' },
  'PodcastGuru': { url: 'https://podcastguru.io' },
  'Breez': { url: 'https://breez.technology' },
  'Sphinx': { url: 'https://sphinx.chat' },
  'LNBeats': { url: 'https://lnbeats.com' },
  'LN Beats': { url: 'https://lnbeats.com', displayName: 'LNBeats' },  // Display without space
  'Satoshis.stream': { url: 'https://satoshis.stream' },
  'Podstation': { url: 'https://podstation.github.io' },
  'Alby': { url: 'https://getalby.com' },
  'TrueFans': { url: 'https://truefans.fm' },
  'Buzzsprout': { url: 'https://buzzsprout.com' },
  // Add more as needed
};

// Utility to normalize podcast/show names for matching
function normalizeShowName(name: string): string {
  return name.trim().toLowerCase();
}

// Utility to get npubs for a show, handling exact and partial matches
function getShowNpubs(showName: string): string[] {
  let showNpubs = showToNpubMap[showName];
  if (!showNpubs) {
    const lowerShowName = normalizeShowName(showName);
    for (const [mappedShow, npubs] of Object.entries(showToNpubMap)) {
      if (lowerShowName === normalizeShowName(mappedShow)) {
        showNpubs = npubs;
        break;
      }
      // Partial match for bitpunk
      if (lowerShowName.includes('bitpunk') && mappedShow.toLowerCase().includes('bitpunk')) {
        showNpubs = npubs;
        logger.info(`🎪 Matched ${showName} to ${mappedShow} via bitpunk pattern`);
        break;
      }
    }
  }
  return showNpubs || [];
}

// Refactored: getShowBasedTags uses getShowNpubs
function getShowBasedTags(showName: string): string[][] {
  const tags: string[][] = [];
  const addedPubkeys = new Set<string>();
  const showNpubs = getShowNpubs(showName);
  if (showNpubs.length > 0) {
    logger.info(`🎪 Found ${showNpubs.length} npubs for show: ${showName}`);
    showNpubs.forEach(npub => {
      try {
        const { data } = nip19.decode(npub);
        let hexPubkey: string;
        if (typeof data === 'string') {
          hexPubkey = data;
        } else if (data instanceof Uint8Array) {
          hexPubkey = Array.from(data, byte => byte.toString(16).padStart(2, '0')).join('');
        } else {
          const uint8Array = new Uint8Array(data as ArrayBufferLike);
          hexPubkey = Array.from(uint8Array, byte => byte.toString(16).padStart(2, '0')).join('');
        }
        if (hexPubkey.length === 128) {
          hexPubkey = hexPubkey.substring(0, 64);
        }
        if (!addedPubkeys.has(hexPubkey)) {
          tags.push(['p', hexPubkey, '', 'mention']);
          addedPubkeys.add(hexPubkey);
          logger.info(`🏷️ Added show-based p-tag for ${showName}`);
        }
      } catch (error) {
        logger.error(`❌ Failed to decode show npub ${npub}:`, error);
      }
    });
  }
  return tags;
}

// Function to process message and replace names with npub tags
function processMessageForTags(message: string): { processedMessage: string; tags: string[][] } {
  let processedMessage = message;
  const tags: string[][] = [];
  const addedPubkeys = new Set<string>(); // Track unique pubkeys to avoid duplicates
  
  console.log(`🏷️ Processing message for tags: "${message}"`);
  
  // Search for each name in the message (case-insensitive)
  Object.entries(nameToNpubMap).forEach(([name, npub]) => {
    // Create regex that matches the name with optional ++
    const regex = new RegExp(`\\b${name}(\\+\\+)?\\b`, 'gi');
    const matches = processedMessage.match(regex);
    
    if (matches) {
      console.log(`✅ Found match for "${name}": ${matches}`);
      matches.forEach(match => {
        const hasPlus = match.includes('++');
        if (hasPlus) {
          // Keep the name++ visible but add npub for tagging
          // Don't replace the text, just add the p-tag
          console.log(`📌 Keeping "${match}" visible with ++ for other systems`);
        } else {
          // Replace name with nostr mention format for regular mentions
          processedMessage = processedMessage.replace(new RegExp(`\\b${name}\\b`, 'gi'), `nostr:${npub}`);
          console.log(`🔄 Replaced "${name}" with nostr mention`);
        }
      });
      
      // Add p tag for the mention (regardless of ++ presence) - only once per unique npub
      try {
        const { data } = nip19.decode(npub);
        let hexPubkey: string;
        
        console.log(`🔍 Raw decoded data type: ${typeof data}, instanceof Uint8Array: ${data instanceof Uint8Array}`);
        console.log(`🔍 Raw decoded data: ${data}`);
        
        if (typeof data === 'string') {
          // If it's already a hex string, use it directly (but it might be the wrong format)
          hexPubkey = data;
        } else if (data instanceof Uint8Array) {
          // Convert Uint8Array to hex
          hexPubkey = Array.from(data, byte => byte.toString(16).padStart(2, '0')).join('');
        } else {
          // Try to convert to Uint8Array first
          const uint8Array = new Uint8Array(data as ArrayBufferLike);
          hexPubkey = Array.from(uint8Array, byte => byte.toString(16).padStart(2, '0')).join('');
        }
        
        // If the hex is 128 chars, it might be double-encoded - take first 64 chars
        if (hexPubkey.length === 128) {
          console.log(`⚠️ Hex too long (${hexPubkey.length}), truncating to first 64 characters`);
          hexPubkey = hexPubkey.substring(0, 64);
        }
        
        if (!addedPubkeys.has(hexPubkey)) {
          console.log(`🔍 Final hex pubkey: ${hexPubkey} (length: ${hexPubkey.length})`);
          tags.push(['p', hexPubkey, '', 'mention']);
          addedPubkeys.add(hexPubkey);
          console.log(`🏷️ Added p-tag for ${name}`);
        } else {
          console.log(`⏭️ Skipping duplicate p-tag for ${name}`);
        }
      } catch (error) {
        console.error(`❌ Failed to decode npub ${npub}:`, error);
      }
    }
  });
  
  console.log(`🏷️ Final processed message: "${processedMessage}"`);
  console.log(`🏷️ Total tags added: ${tags.length}`);
  
  return { processedMessage, tags };
}

async function postBoostToNostr(event: HelipadPaymentEvent, bot: any, sessionId?: string, allSplits?: HelipadPaymentEvent[]): Promise<void> {
  logger.info('Starting to post boost to Nostr', {
    sender: event.sender,
    amount: event.value_msat_total / 1000,
    podcast: event.podcast,
    episode: event.episode,
    totalSplits: allSplits?.length || 1
  });
  
  const actionText = "📤 Boost Sent!";
  const senderLabel = "👤 Sender";
  
  // Replace ChadF with npub for sender display
  const senderDisplay = event.sender === 'ChadF' ? 'nostr:npub177fz5zkm87jdmf0we2nz7mm7uc2e7l64uzqrv6rvdrsg8qkrg7yqx0aaq7' : event.sender;

  // Parse TLV data to build show link
  let showLink = '';
  try {
    if (event.tlv) {
      const tlvData = JSON.parse(event.tlv);
      let feedID = tlvData.feedID;
      const showGuid = tlvData.guid;
      
      // Link to show page (has all episodes + app chooser + episodes.fm button)
      if (feedID) {
        showLink = `https://podcastindex.org/podcast/${feedID}`;
      } else if (showGuid) {
        // Use show GUID to lookup feedID (some apps like PodcastGuru send this)
        logger.info(`🔍 No feedID found, attempting to look up by GUID: ${showGuid}`);
        const lookedUpFeedId = await lookupFeedIdByGuid(showGuid);
        if (lookedUpFeedId) {
          showLink = `https://podcastindex.org/podcast/${lookedUpFeedId}`;
        } else {
          // If lookup fails, we can't create a working link
          logger.warn(`⚠️ Could not find feedID for GUID ${showGuid}, no show link will be included`);
        }
      }
    }
  } catch (error) {
    console.warn('⚠️ Failed to parse TLV data for show link:', error);
  }

  // Check if this is a music boost (has remote_podcast and remote_episode)
  const isMusic = event.remote_podcast && event.remote_podcast.trim() && 
                  event.remote_episode && event.remote_episode.trim();
  
  // Extract artist name from TLV data if available (more accurate than remote_podcast)
  // Search through all splits to find the artist (usually in a split with "via Wavlake" or similar)
  let artistName = event.remote_podcast; // Default fallback
  let musicFeedGuid: string | undefined;
  if (isMusic) {
    const splitsToCheck = allSplits && allSplits.length > 0 ? allSplits : [event];

    for (const split of splitsToCheck) {
      if (!split.tlv) continue;

      try {
        const tlvData = typeof split.tlv === 'string' ? JSON.parse(split.tlv) : split.tlv;

        // Look for artist name in TLV (check for "via Wavlake" pattern or remote_feed_guid mismatch)
        if (tlvData.name && typeof tlvData.name === 'string') {
          const nameValue = tlvData.name;

          // This is likely an artist if it contains "via Wavlake" or similar platform indicators
          if (nameValue.match(/\s+via\s+\w+/i)) {
            artistName = nameValue
              .replace(/\s+via\s+Wavlake$/i, '')
              .replace(/\s+via\s+\w+$/i, '')
              .replace(/\s+on\s+\w+$/i, '')
              .trim();
            logger.info(`🎵 Found artist from split: ${artistName} (from "${nameValue}")`);

            if (tlvData.remote_feed_guid) {
              musicFeedGuid = tlvData.remote_feed_guid;
            }
            break; // Found the artist, stop searching
          }
        }
      } catch (error) {
        logger.warn('Failed to parse TLV for artist name', { error: error?.message });
      }
    }

    // If no artist found with "via" pattern, use the first TLV name we find
    if (artistName === event.remote_podcast && event.tlv) {
      try {
        const tlvData = typeof event.tlv === 'string' ? JSON.parse(event.tlv) : event.tlv;
        if (tlvData.name && typeof tlvData.name === 'string') {
          artistName = tlvData.name
            .replace(/\s+via\s+Wavlake$/i, '')
            .replace(/\s+via\s+\w+$/i, '')
            .replace(/\s+on\s+\w+$/i, '')
            .trim();
          logger.info(`🎵 Using artist name from first split: ${artistName}`);
        }
        if (tlvData.remote_feed_guid && !musicFeedGuid) {
          musicFeedGuid = tlvData.remote_feed_guid;
        }
      } catch (error) {
        logger.warn('Failed to parse TLV for artist name', { error: error?.message });
      }
    }
  }

  // Process message for auto-tagging
  let messageTags: string[][] = [];
  let displayMessage = event.message;
  
  if (event.message && event.message.trim()) {
    const { processedMessage, tags } = processMessageForTags(event.message);
    displayMessage = processedMessage;
    messageTags = tags;
  }

  // Get show-based tags for automatic tagging
  let showTags: string[][] = [];
  let showHostMentions: string[] = [];
  if (isMusic && event.podcast) {
    // For music, tag based on the hosting show
    showTags = getShowBasedTags(event.podcast);
  } else if (event.podcast) {
    // For regular podcasts, tag based on podcast name
    showTags = getShowBasedTags(event.podcast);
  }

  // Build visible host mentions (e.g., nostr:npub1... nostr:npub1...)
  if (event.podcast) {
    const showNpubs = getShowNpubs(event.podcast);
    for (const npub of showNpubs) {
      showHostMentions.push(`nostr:${npub}`);
    }
  }

  // Find the actual track name from all splits (if music boost)
  let actualTrackName = event.remote_episode; // Default to current event
  if (isMusic && allSplits && allSplits.length > 0) {
    // First, try to find track name in splits where remote_podcast === remote_episode
    for (const split of allSplits) {
      // Look for a split where remote_podcast and remote_episode are the same (usually indicates track info)
      if (split.remote_podcast && split.remote_episode &&
          split.remote_podcast === split.remote_episode &&
          split.remote_podcast !== event.podcast && // Not the show name
          split.remote_episode !== event.episode) { // Not the episode name
        actualTrackName = split.remote_episode;
        logger.info(`🎵 Found actual track name from split: ${actualTrackName}`);
        break;
      }
    }

    // If we didn't find the track name in the splits, try looking it up via Podcast Index API
    if (actualTrackName === event.remote_episode || actualTrackName === event.episode) {
      logger.info(`🔍 Attempting to lookup track name from Podcast Index API`);

      // First, try to find a split that's NOT the artist split (e.g., UpBEATS Music Podcast)
      // This split often has the remote_feed_guid for the track feed
      for (const split of allSplits) {
        if (!split.tlv) continue;

        try {
          const tlvData = typeof split.tlv === 'string' ? JSON.parse(split.tlv) : split.tlv;

          // Look for splits that are NOT the artist (don't have "via Wavlake") but have remote_item_guid
          if (tlvData.name && !tlvData.name.match(/\s+via\s+\w+/i) &&
              tlvData.remote_item_guid && tlvData.remote_feed_guid) {
            logger.info(`🔍 Trying lookup with music feed split: ${tlvData.name}`);

            // Try to fetch the track name from Podcast Index API using podcast GUID
            const lookedUpTrackName = await lookupTrackNameByGUID(
              tlvData.remote_item_guid,
              undefined, // no feedID
              tlvData.remote_feed_guid // use podcast GUID instead
            );

            if (lookedUpTrackName && lookedUpTrackName !== event.episode) {
              actualTrackName = lookedUpTrackName;
              logger.info(`✅ Using track name from API (music feed): ${actualTrackName}`);
              break;
            }
          }
        } catch (error) {
          logger.warn('Failed to parse TLV for track name lookup', { error: error?.message });
        }
      }

      // If still not found, try the artist split as fallback
      if (actualTrackName === event.remote_episode || actualTrackName === event.episode) {
        for (const split of allSplits) {
          if (!split.tlv) continue;

          try {
            const tlvData = typeof split.tlv === 'string' ? JSON.parse(split.tlv) : split.tlv;

            // Look for the artist split (has "via Wavlake" pattern) with remote_item_guid
            if (tlvData.name && tlvData.name.match(/\s+via\s+\w+/i) &&
                tlvData.remote_item_guid && tlvData.remote_feed_guid) {
              logger.info(`🔍 Trying lookup with artist split: ${tlvData.name}`);

              // Try to fetch the track name from Podcast Index API using podcast GUID
              const lookedUpTrackName = await lookupTrackNameByGUID(
                tlvData.remote_item_guid,
                undefined,
                tlvData.remote_feed_guid
              );

              if (lookedUpTrackName && lookedUpTrackName !== event.episode) {
                actualTrackName = lookedUpTrackName;
                logger.info(`✅ Using track name from API (artist feed): ${actualTrackName}`);
                break;
              }
            }
          } catch (error) {
            logger.warn('Failed to parse TLV for track name lookup', { error: error?.message });
          }
        }
      }
    }
  }

  // Format the content for Nostr - minimal style
  const satsAmount = Math.floor(event.value_msat_total / 1000);
  let content = '';

  // Build the message part with sats amount and app attribution
  const satsDisplay = `⚡ ${satsAmount} sats`;
  
  // Extract app name from TLV data for attribution
  let appAttribution = '';
  try {
    if (event.tlv) {
      const tlvData = typeof event.tlv === 'string' ? JSON.parse(event.tlv) : event.tlv;
      if (tlvData.app_name && typeof tlvData.app_name === 'string') {
        appAttribution = `\n📱 via ${tlvData.app_name}`;
      }
    }
  } catch (error) {
    logger.debug('Failed to extract app_name from TLV', { error: error?.message });
  }

  if (displayMessage && displayMessage.trim()) {
    content = `${displayMessage}\n\n${satsDisplay}${appAttribution}`;
  } else {
    // Default message if no boostagram message
    const showName = event.podcast && event.podcast.trim() && event.podcast.trim().toLowerCase() !== 'nameless'
      ? event.podcast
      : 'Unknown';
    content = `${satsDisplay}${appAttribution}`;
  }

  // Add link on new line
  if (isMusic && musicFeedGuid) {
    content += `\n\nhttps://lnbeats.com/album/${musicFeedGuid}`;
  } else if (showLink) {
    content += `\n\n${showLink}`;
  }

  // Add host mentions on new line if present
  if (showHostMentions.length > 0) {
    content += `\n\n${showHostMentions.join(' ')}`;
  }

  // Check for duplicate content if sessionId is provided
  if (sessionId && isDuplicateContent(content, sessionId)) {
    logger.info('Skipping duplicate boost post', { 
      sessionId,
      sender: event.sender,
      amount: event.value_msat_total / 1000
    });
    return;
  }

  // Extract metadata tags from TLV - merge data from all splits
  const metadataTags: string[][] = [];
  const seenGuids = new Set<string>(); // Track unique GUIDs to avoid duplicates

  try {
    // Process all splits to collect all unique metadata
    const splitsToProcess = allSplits && allSplits.length > 0 ? allSplits : [event];

    for (const split of splitsToProcess) {
      if (!split.tlv) {
        logger.debug('Split has no TLV data');
        continue;
      }

      const tlvData = typeof split.tlv === 'string' ? JSON.parse(split.tlv) : split.tlv;
      logger.info('🔍 TLV data fields:', Object.keys(tlvData));

      // Add podcast:item:guid (episode)
      if (tlvData.itemID || tlvData.episode_guid || tlvData.guid) {
        const itemGuid = tlvData.itemID || tlvData.episode_guid || tlvData.guid;
        const guidKey = `item:${itemGuid}`;
        if (!seenGuids.has(guidKey)) {
          const itemUrl = tlvData.url || tlvData.boost_link || '';
          metadataTags.push(['k', 'podcast:item:guid']);
          metadataTags.push(['i', `podcast:item:guid:${itemGuid}`, itemUrl]);
          seenGuids.add(guidKey);
          logger.info(`✅ Added podcast:item:guid tag: ${itemGuid}`);
        }
      }

      // Add podcast:guid (feed GUID) - note: PodcastGuru doesn't send feed GUID in TLV
      if (tlvData.feedID || tlvData.podcast_guid || tlvData.feed_guid) {
        const feedGuid = tlvData.feedID || tlvData.podcast_guid || tlvData.feed_guid;
        const guidKey = `feed:${feedGuid}`;
        if (!seenGuids.has(guidKey)) {
          const feedUrl = tlvData.url || tlvData.boost_link || '';
          metadataTags.push(['k', 'podcast:guid']);
          metadataTags.push(['i', `podcast:guid:${feedGuid}`, feedUrl]);
          seenGuids.add(guidKey);
          logger.info(`✅ Added podcast:guid tag: ${feedGuid}`);
        }
      }

      // Add podcast:publisher:guid
      if (tlvData.publisher_guid) {
        const guidKey = `publisher:${tlvData.publisher_guid}`;
        if (!seenGuids.has(guidKey)) {
          const publisherUrl = tlvData.url || '';
          metadataTags.push(['k', 'podcast:publisher:guid']);
          metadataTags.push(['i', `podcast:publisher:guid:${tlvData.publisher_guid}`, publisherUrl]);
          seenGuids.add(guidKey);
        }
      }

      // Add image tag if available (use first one found)
      if (tlvData.image && !metadataTags.some(tag => tag[0] === 'image')) {
        metadataTags.push(['image', tlvData.image]);
      }

      // Add remote feed GUID for music
      if (tlvData.remote_feed_guid) {
        const guidKey = `remote_feed:${tlvData.remote_feed_guid}`;
        if (!seenGuids.has(guidKey)) {
          metadataTags.push(['k', 'podcast:guid']);
          metadataTags.push(['i', `podcast:guid:${tlvData.remote_feed_guid}`, tlvData.url || '']);
          seenGuids.add(guidKey);
        }
      }

      // Add remote item GUID for music tracks
      if (tlvData.remote_item_guid) {
        const guidKey = `remote_item:${tlvData.remote_item_guid}`;
        if (!seenGuids.has(guidKey)) {
          metadataTags.push(['k', 'podcast:item:guid']);
          metadataTags.push(['i', `podcast:item:guid:${tlvData.remote_item_guid}`, tlvData.url || '']);
          seenGuids.add(guidKey);
        }
      }
    }

    logger.info(`📋 Collected metadata from ${splitsToProcess.length} splits: ${seenGuids.size} unique GUIDs`);
  } catch (error) {
    logger.warn('Failed to extract metadata tags from TLV', { error: error?.message });
  }

  // Add zap receipt tags for NIP-57 compatibility
  const zapTags: string[][] = [];

  // Get recipient pubkey (the bot itself)
  const recipientPubkey = getPublicKey(bot.getSecretKey());

  // Use bot pubkey as sender since this is a single-user bot
  // This is more honest than using Lightning node pubkeys from non-Nostr sources
  const senderPubkey = recipientPubkey;
  logger.info('Using bot pubkey as zap sender (single-user bot)');

  // Create proper zap request event (kind 9734) matching Fountain's format
  const zapRequest = {
    kind: 9734,
    pubkey: senderPubkey,
    created_at: event.time,
    tags: [
      ['relays', ...bot.getRelays().slice(0, 3)],
      ['amount', (event.value_msat_total).toString()],
      ...metadataTags, // Include podcast k and i tags in zap request
      ['p', recipientPubkey],
    ],
    content: event.message || '',
  };

  // Create zap request event and get its ID
  const zapRequestEvent = finalizeEvent(zapRequest, bot.getSecretKey());
  const zapRequestJson = JSON.stringify(zapRequest);

  // Create kind 9735 zap receipt tags (proper NIP-57 zap receipt)
  zapTags.push(['p', senderPubkey]); // Zap sender
  zapTags.push(['P', recipientPubkey]); // Zap recipient (uppercase P)
  zapTags.push(['amount', (event.value_msat_total).toString()]); // Amount in millisats
  zapTags.push(['description', zapRequestJson]); // Zap request (kind 9734)
  zapTags.push(['e', zapRequestEvent.id]); // Reference to zap request event

  // Add payment_hash as a reference tag if available
  if (event.payment_info?.payment_hash) {
    zapTags.push(['payment_hash', event.payment_info.payment_hash]);
  }

  // Add relay hints
  zapTags.push(['relays', ...bot.getRelays().slice(0, 3)]);

  // Combine tags - minimal style with zap receipt data
  const allTags = [
    ...messageTags,
    ...showTags,
    ...metadataTags,
    ...zapTags
  ];

  logger.info('📋 Tags being added to zap receipt (kind 9735)', {
    totalTags: allTags.length,
    metadataTagsCount: metadataTags.length,
    zapTagsCount: zapTags.length,
    hasSenderPubkey: !!event.payment_info?.pubkey,
    zapRequestId: zapRequestEvent.id
  });

  // Publish the zap request first
  await bot.publishToRelays(zapRequestEvent);

  // Create and publish the zap receipt (kind 9735) for technical compliance
  const zapReceiptEvent = finalizeEvent({
    kind: 9735,
    content,
    tags: allTags,
    created_at: Math.floor(Date.now() / 1000),
  }, bot.getSecretKey());

  await bot.publishToRelays(zapReceiptEvent);

  // Generate nevent reference to the zap receipt to show amount in social post
  const zapReceiptNevent = nip19.neventEncode({
    id: zapReceiptEvent.id,
    relays: bot.getRelays().slice(0, 3),
    kind: 9735
  });

  // Create social note content with nevent reference (like Fountain does)
  const socialContent = `${content}\n\nnostr:${zapReceiptNevent}`;

  // Create and publish a visible kind 1 note for social feeds
  const socialNoteEvent = finalizeEvent({
    kind: 1,
    content: socialContent,
    tags: [
      ...messageTags,
      ...showTags,
      ...metadataTags,
      // Add basic social tags without heavy zap metadata
      ['t', 'boost'],
      ['t', 'value4value'],
      ['t', 'podcasting20']
    ],
    created_at: Math.floor(Date.now() / 1000),
  }, bot.getSecretKey());

  await bot.publishToRelays(socialNoteEvent);

  // Add to recent posts tracking if sessionId is provided
  if (sessionId) {
    addToRecentPosts(socialNoteEvent.content, sessionId);
  }

  logger.info('Successfully posted hybrid boost events to Nostr', {
    sender: event.sender,
    amount: event.value_msat_total / 1000,
    contentLength: socialNoteEvent.content.length,
    zapRequestId: zapRequestEvent.id,
    zapReceiptId: zapReceiptEvent.id,
    socialNoteId: socialNoteEvent.id,
    zapReceiptNevent: zapReceiptNevent,
    eventsPublished: 3
  });
}