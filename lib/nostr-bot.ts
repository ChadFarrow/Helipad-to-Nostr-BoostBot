// Server-side only - Nostr bot for posting fundraiser updates
// NOTE: This will only work if you deploy to a server environment (not static hosting)
// For static hosting, you'll need to set up a separate server/API for bot posting
import { finalizeEvent, nip19 } from 'nostr-tools';
import { Relay } from 'nostr-tools/relay';
import { promises as fs } from 'fs';
import path from 'path';
import { logger } from './logger.js';

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
        const relay = await Relay.connect(relayUrl);
        logger.debug(`Publishing to ${relayUrl}`);
        await relay.publish(event);
        relay.close();
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
const boostSessions = new Map<string, { largestSplit: HelipadPaymentEvent, timeout: NodeJS.Timeout }>();
const postedBoosts = new Set<string>();

// Clean up old posted boosts every hour to prevent memory leaks
setInterval(() => {
  const oneHourAgo = Math.floor((Date.now() - 3600000) / 120000); // 1 hour ago in 2-minute windows
  const toDelete: string[] = [];
  
  postedBoosts.forEach(sessionId => {
    const timeWindow = parseInt(sessionId.split('-')[0]);
    if (timeWindow < oneHourAgo) {
      toDelete.push(sessionId);
    }
  });
  
  toDelete.forEach(sessionId => postedBoosts.delete(sessionId));
  
  if (toDelete.length > 0) {
    logger.info(`🧹 Cleaned up ${toDelete.length} old posted boost sessions`);
  }
}, 3600000); // Run every hour

// Interface for persisting session data
interface PersistedSession {
  sessionId: string;
  largestSplit: HelipadPaymentEvent;
  expiresAt: number; // timestamp when session should timeout
}

// Daily tracking for streams and boosts
interface DailyStats {
  date: string;
  streamSats: number;
  boostSats: number;
  streamShows: Set<string>;
  boostShows: Set<string>;
}

// Weekly tracking for streams and boosts
interface WeeklyStats {
  weekStart: string; // ISO date of the Monday
  streamSats: number;
  boostSats: number;
  streamShows: Set<string>;
  boostShows: Set<string>;
  dailyBreakdown: { date: string; streamSats: number; boostSats: number }[];
}

// Supported creators tracking
interface SupportedCreator {
  name: string;
  type: 'podcast' | 'musician';
  firstSupported: string; // ISO date
  lastSupported: string; // ISO date
  totalBoosts: number;
  totalSats: number;
}

interface SupportedCreators {
  [key: string]: SupportedCreator;
}

let dailyStats: DailyStats = {
  date: new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' }), // YYYY-MM-DD in Eastern Time
  streamSats: 0,
  boostSats: 0,
  streamShows: new Set(),
  boostShows: new Set()
};

// Get Monday of current week
function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  return new Date(d.setDate(diff)).toISOString().split('T')[0];
}

let weeklyStats: WeeklyStats = {
  weekStart: getWeekStart(new Date()),
  streamSats: 0,
  boostSats: 0,
  streamShows: new Set(),
  boostShows: new Set(),
  dailyBreakdown: []
};

let supportedCreators: SupportedCreators = {};

// Daily and weekly summary timeouts
let dailySummaryTimeout: NodeJS.Timeout | null = null;
let weeklySummaryTimeout: NodeJS.Timeout | null = null;

// Hourly save timeout
let hourlySaveTimeout: NodeJS.Timeout | null = null;

function scheduleHourlySave(): void {
  if (hourlySaveTimeout) {
    clearTimeout(hourlySaveTimeout);
  }
  
  hourlySaveTimeout = setTimeout(async () => {
    await saveDailyStats();
    await saveWeeklyStats();
    console.log(`💾 Hourly save completed`);
    scheduleHourlySave(); // Schedule next hour
  }, 60 * 60 * 1000); // 1 hour
  
  console.log(`💾 Hourly save scheduled`);
}

// File paths for persisting stats and sessions
const DAILY_STATS_FILE = path.join(process.cwd(), 'daily-stats.json');
const WEEKLY_STATS_FILE = path.join(process.cwd(), 'weekly-stats.json');
const BOOST_SESSIONS_FILE = path.join(process.cwd(), 'boost-sessions.json');
const SUPPORTED_CREATORS_FILE = path.join(process.cwd(), 'supported-creators.json');

// Load daily stats from file
async function loadDailyStats(): Promise<void> {
  try {
    const data = await fs.readFile(DAILY_STATS_FILE, 'utf-8');
    const saved = JSON.parse(data);
    
    // Check if saved data is from today
    const currentDate = new Date().toISOString().split('T')[0];
    if (saved.date === currentDate) {
      dailyStats = {
        date: saved.date,
        streamSats: saved.streamSats || 0,
        boostSats: saved.boostSats || 0,
        streamShows: new Set(saved.streamShows || []),
        boostShows: new Set(saved.boostShows || [])
      };
      console.log(`📊 Loaded daily stats: ${dailyStats.streamSats + dailyStats.boostSats} total sats`);
    } else {
      console.log(`📅 New day detected, starting fresh stats`);
    }
  } catch (error) {
    console.log(`📊 No previous daily stats found, starting fresh`);
  }
}

// Save daily stats to file
async function saveDailyStats(): Promise<void> {
  try {
    const dataToSave = {
      date: dailyStats.date,
      streamSats: dailyStats.streamSats,
      boostSats: dailyStats.boostSats,
      streamShows: Array.from(dailyStats.streamShows),
      boostShows: Array.from(dailyStats.boostShows)
    };
    await fs.writeFile(DAILY_STATS_FILE, JSON.stringify(dataToSave, null, 2));
  } catch (error) {
    console.error(`❌ Failed to save daily stats:`, error);
  }
}

// Load weekly stats from file
async function loadWeeklyStats(): Promise<void> {
  try {
    const data = await fs.readFile(WEEKLY_STATS_FILE, 'utf-8');
    const saved = JSON.parse(data);
    
    // Check if saved data is from current week
    const currentWeekStart = getWeekStart(new Date());
    if (saved.weekStart === currentWeekStart) {
      weeklyStats = {
        weekStart: saved.weekStart,
        streamSats: saved.streamSats || 0,
        boostSats: saved.boostSats || 0,
        streamShows: new Set(saved.streamShows || []),
        boostShows: new Set(saved.boostShows || []),
        dailyBreakdown: saved.dailyBreakdown || []
      };
      console.log(`📊 Loaded weekly stats: ${weeklyStats.streamSats + weeklyStats.boostSats} total sats this week`);
    } else {
      console.log(`📅 New week detected, starting fresh weekly stats`);
    }
  } catch (error) {
    console.log(`📊 No previous weekly stats found, starting fresh`);
  }
}

// Save weekly stats to file
async function saveWeeklyStats(): Promise<void> {
  try {
    const dataToSave = {
      weekStart: weeklyStats.weekStart,
      streamSats: weeklyStats.streamSats,
      boostSats: weeklyStats.boostSats,
      streamShows: Array.from(weeklyStats.streamShows),
      boostShows: Array.from(weeklyStats.boostShows),
      dailyBreakdown: weeklyStats.dailyBreakdown
    };
    await fs.writeFile(WEEKLY_STATS_FILE, JSON.stringify(dataToSave, null, 2));
  } catch (error) {
    console.error(`❌ Failed to save weekly stats:`, error);
  }
}

// Load supported creators from file
async function loadSupportedCreators(): Promise<void> {
  try {
    const data = await fs.readFile(SUPPORTED_CREATORS_FILE, 'utf-8');
    supportedCreators = JSON.parse(data);
    console.log(`📝 Loaded ${Object.keys(supportedCreators).length} supported creators`);
  } catch (error) {
    console.log(`📝 No previous supported creators found`);
    supportedCreators = {};
  }
}

// Save supported creators to file
async function saveSupportedCreators(): Promise<void> {
  try {
    await fs.writeFile(SUPPORTED_CREATORS_FILE, JSON.stringify(supportedCreators, null, 2));
  } catch (error) {
    console.error(`❌ Failed to save supported creators:`, error);
  }
}

// Track a supported creator
async function trackSupportedCreator(name: string, type: 'podcast' | 'musician', satsAmount: number): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const key = `${type}:${name}`;
  
  if (supportedCreators[key]) {
    // Update existing creator
    supportedCreators[key].lastSupported = today;
    supportedCreators[key].totalBoosts++;
    supportedCreators[key].totalSats += satsAmount;
  } else {
    // Add new creator
    supportedCreators[key] = {
      name,
      type,
      firstSupported: today,
      lastSupported: today,
      totalBoosts: 1,
      totalSats: satsAmount
    };
    console.log(`📝 Now tracking new ${type}: ${name}`);
  }
  
  await saveSupportedCreators();
}

// Load boost sessions from file
async function loadBoostSessions(): Promise<void> {
  try {
    const data = await fs.readFile(BOOST_SESSIONS_FILE, 'utf-8');
    const savedSessions: PersistedSession[] = JSON.parse(data);
    const now = Date.now();
    let loadedCount = 0;
    let expiredCount = 0;
    
    savedSessions.forEach(async (session) => {
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
              await postBoostToNostr(session.largestSplit, bot);
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
          timeout
        });
        loadedCount++;
      } else {
        // Session has expired, post it immediately
        expiredCount++;
        logger.info(`Posting expired session ${session.sessionId} immediately`, { 
          amount: session.largestSplit.value_msat / 1000, 
          total: session.largestSplit.value_msat_total / 1000,
          expiredBy: now - session.expiresAt
        });
        
        const bot = createNostrBot();
        if (bot) {
          postedBoosts.add(session.sessionId);
          try {
            await postBoostToNostr(session.largestSplit, bot);
          } catch (error) {
            logger.error('Error in postBoostToNostr for expired session', { 
              error: error.message, 
              stack: error.stack,
              session: session.sessionId,
              amount: session.largestSplit.value_msat_total / 1000
            });
          }
        }
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
          expiresAt: now + 30000 // Current time + 30 seconds
        });
      }
    });
    
    await fs.writeFile(BOOST_SESSIONS_FILE, JSON.stringify(sessionsToSave, null, 2));
  } catch (error) {
    logger.error(`❌ Failed to save boost sessions:`, error);
  }
}

async function postDailySummary(): Promise<void> {
  const bot = createNostrBot();
  if (!bot) return;

  const streamShows = Array.from(dailyStats.streamShows);
  const boostShows = Array.from(dailyStats.boostShows);

  // Get all shows you supported (streamed + boosted)
  const allShows = [...new Set([...streamShows, ...boostShows])];
  
  // Build p-tags for hosts of shows you supported
  const pTags: string[][] = [];
  const addedPubkeys = new Set<string>();
  
  for (const show of allShows) {
    const showNpubs = getShowNpubs(show);
    for (const npub of showNpubs) {
      try {
        const { type, data } = nip19.decode(npub);
        if (type === 'npub') {
          const hexPubkey = data as string;
          if (!addedPubkeys.has(hexPubkey)) {
            pTags.push(['p', hexPubkey, '', 'mention']);
            addedPubkeys.add(hexPubkey);
          }
        }
      } catch (error) {
        console.error(`❌ Failed to decode npub ${npub}:`, error);
      }
    }
  }

  const content = `📊 Daily V4V Summary - ${dailyStats.date}

🌊 Streamed: ${dailyStats.streamSats.toLocaleString()} sats
📤 Boosted: ${dailyStats.boostSats.toLocaleString()} sats
💰 Total: ${(dailyStats.streamSats + dailyStats.boostSats).toLocaleString()} sats

${streamShows.length > 0 ? `🎧 Streamed to:\n${streamShows.map(show => `• ${show}`).join('\n')}\n` : ''}
${boostShows.length > 0 ? `🚀 Boosted:\n${boostShows.map(show => `• ${show}`).join('\n')}` : ''}

#V4V #Podcasting20 #PC20 #ValueStreaming #Boostagram`;

  const nostrEvent = finalizeEvent({
    kind: 1,
    content,
    tags: [
      ['t', 'v4v'],
      ['t', 'podcasting20'],
      ['t', 'pc20'],
      ['t', 'valuestreaming'],
      ['t', 'boostagram'],
      ['t', 'dailysummary'],
      ...pTags
    ],
    created_at: Math.floor(Date.now() / 1000),
  }, bot.getSecretKey());

  await bot.publishToRelays(nostrEvent);
  console.log(`📊 Posted daily summary: ${dailyStats.streamSats + dailyStats.boostSats} total sats (tagged ${pTags.length} hosts)`);
}

async function resetDailyStats(): Promise<void> {
  // Save current day to weekly breakdown before resetting
  const currentDay = {
    date: dailyStats.date,
    streamSats: dailyStats.streamSats,
    boostSats: dailyStats.boostSats
  };
  
  // Add to weekly breakdown if not already added
  const existingDayIndex = weeklyStats.dailyBreakdown.findIndex(d => d.date === currentDay.date);
  if (existingDayIndex >= 0) {
    weeklyStats.dailyBreakdown[existingDayIndex] = currentDay;
  } else {
    weeklyStats.dailyBreakdown.push(currentDay);
  }
  
  dailyStats = {
    date: new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' }),
    streamSats: 0,
    boostSats: 0,
    streamShows: new Set(),
    boostShows: new Set()
  };
  await saveDailyStats();
  await saveWeeklyStats();
}

async function postWeeklySummary(): Promise<void> {
  const bot = createNostrBot();
  if (!bot) return;

  const streamShows = Array.from(weeklyStats.streamShows);
  const boostShows = Array.from(weeklyStats.boostShows);
  
  // Format date range
  const weekStart = new Date(weeklyStats.weekStart);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  
  const formatDate = (date: Date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const dateRange = `${formatDate(weekStart)} - ${formatDate(weekEnd)}`;

  // Create daily breakdown text
  const dailyBreakdownText = weeklyStats.dailyBreakdown
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(day => {
      const dayName = new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' });
      const total = day.streamSats + day.boostSats;
      return `${dayName}: ${total.toLocaleString()} sats`;
    })
    .join(' | ');

  const content = `📊 Weekly V4V Summary - ${dateRange}

🌊 Streamed: ${weeklyStats.streamSats.toLocaleString()} sats
📤 Boosted: ${weeklyStats.boostSats.toLocaleString()} sats
💰 Total: ${(weeklyStats.streamSats + weeklyStats.boostSats).toLocaleString()} sats

📈 Daily breakdown: ${dailyBreakdownText}

${streamShows.length > 0 ? `🎧 Streamed to:\n${streamShows.map(show => `• ${show}`).join('\n')}\n` : ''}
${boostShows.length > 0 ? `🚀 Boosted:\n${boostShows.map(show => `• ${show}`).join('\n')}` : ''}

#V4V #Podcasting20 #PC20 #ValueStreaming #WeeklySummary`;

  const nostrEvent = finalizeEvent({
    kind: 1,
    content,
    tags: [
      ['t', 'v4v'],
      ['t', 'podcasting20'],
      ['t', 'pc20'],
      ['t', 'valuestreaming'],
      ['t', 'weeklysummary'],
    ],
    created_at: Math.floor(Date.now() / 1000),
  }, bot.getSecretKey());

  await bot.publishToRelays(nostrEvent);
  console.log(`📊 Posted weekly summary: ${weeklyStats.streamSats + weeklyStats.boostSats} total sats this week`);
}

async function resetWeeklyStats(): Promise<void> {
  weeklyStats = {
    weekStart: getWeekStart(new Date()),
    streamSats: 0,
    boostSats: 0,
    streamShows: new Set(),
    boostShows: new Set(),
    dailyBreakdown: []
  };
  await saveWeeklyStats();
}

function scheduleDailySummary(): void {
  if (dailySummaryTimeout) {
    clearTimeout(dailySummaryTimeout);
  }

  // Get current time in Eastern timezone
  const now = new Date();
  const nowET = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  
  // Create midnight ET for today
  const midnightET = new Date(nowET);
  midnightET.setHours(0, 0, 0, 0);
  
  // If already past midnight, schedule for tomorrow
  if (nowET.getTime() >= midnightET.getTime()) {
    midnightET.setDate(midnightET.getDate() + 1);
  }
  
  // Convert back to UTC for setTimeout
  const etOffset = now.getTime() - nowET.getTime();
  const midnightUTC = new Date(midnightET.getTime() + etOffset);
  const msUntilMidnight = midnightUTC.getTime() - now.getTime();

  dailySummaryTimeout = setTimeout(async () => {
    await postDailySummary();
    await resetDailyStats();
    scheduleDailySummary(); // Schedule next day
  }, msUntilMidnight);

  console.log(`📅 Daily summary scheduled for ${midnightUTC.toLocaleString('en-US', { timeZone: 'America/New_York' })} (midnight EDT)`);
}

function scheduleWeeklySummary(): void {
  if (weeklySummaryTimeout) {
    clearTimeout(weeklySummaryTimeout);
  }

  // Calculate time until next Sunday midnight EDT
  const now = new Date();
  
  // Create next Sunday midnight EDT
  const nextSundayMidnight = new Date();
  nextSundayMidnight.setUTCHours(4, 0, 0, 0); // EDT is UTC-4
  
  // Find next Sunday (0 = Sunday)
  const daysUntilSunday = (7 - now.getDay()) % 7;
  if (daysUntilSunday === 0 && now.getTime() >= nextSundayMidnight.getTime()) {
    // If it's Sunday and past midnight, schedule for next Sunday
    nextSundayMidnight.setUTCDate(nextSundayMidnight.getUTCDate() + 7);
  } else {
    nextSundayMidnight.setUTCDate(nextSundayMidnight.getUTCDate() + daysUntilSunday);
  }
  
  const msUntilSunday = nextSundayMidnight.getTime() - now.getTime();

  weeklySummaryTimeout = setTimeout(async () => {
    await postWeeklySummary();
    await resetWeeklyStats();
    scheduleWeeklySummary(); // Schedule next week
  }, msUntilSunday);

  console.log(`📅 Weekly summary scheduled for ${nextSundayMidnight.toLocaleString()} (Sunday midnight EDT)`);
}

// Test function to manually post current daily summary
export async function postTestDailySummary(): Promise<void> {
  console.log(`📊 Posting test daily summary...`);
  
  // Save current real data
  const originalStats = {
    streamSats: dailyStats.streamSats,
    boostSats: dailyStats.boostSats,
    streamShows: new Set(dailyStats.streamShows),
    boostShows: new Set(dailyStats.boostShows)
  };
  
  // Add temporary test data to see the format
  dailyStats.streamSats = 1250;
  dailyStats.boostSats = 500;
  dailyStats.streamShows.add("Lightning Thrashes");
  dailyStats.streamShows.add("The Wait Is Over");
  dailyStats.streamShows.add("Underwater - Single");
  dailyStats.boostShows.add("Lightning Thrashes");
  dailyStats.boostShows.add("Mike's Mixtape");
  
  console.log(`Test stats: ${dailyStats.streamSats} stream sats, ${dailyStats.boostSats} boost sats`);
  console.log(`Test shows: ${Array.from(dailyStats.streamShows).join(', ')} | ${Array.from(dailyStats.boostShows).join(', ')}`);
  await postDailySummary();
  
  // Restore original data without saving test data to weekly stats
  dailyStats.streamSats = originalStats.streamSats;
  dailyStats.boostSats = originalStats.boostSats;
  dailyStats.streamShows = originalStats.streamShows;
  dailyStats.boostShows = originalStats.boostShows;
  
  // Save the restored real data
  await saveDailyStats();
}

// Test function to manually post current weekly summary
export async function postTestWeeklySummary(): Promise<void> {
  console.log(`📊 Posting test weekly summary...`);
  
  // Save current real data
  const originalWeeklyStats = {
    streamSats: weeklyStats.streamSats,
    boostSats: weeklyStats.boostSats,
    streamShows: new Set(weeklyStats.streamShows),
    boostShows: new Set(weeklyStats.boostShows),
    dailyBreakdown: [...weeklyStats.dailyBreakdown]
  };
  
  // Add some test data
  weeklyStats.streamSats = 8500;
  weeklyStats.boostSats = 3200;
  weeklyStats.streamShows.add("Lightning Thrashes");
  weeklyStats.streamShows.add("No Solutions");
  weeklyStats.boostShows.add("Mike's Mixtape");
  weeklyStats.boostShows.add("Bowl After Bowl");
  weeklyStats.dailyBreakdown = [
    { date: '2025-06-16', streamSats: 1200, boostSats: 400 },
    { date: '2025-06-17', streamSats: 800, boostSats: 0 },
    { date: '2025-06-18', streamSats: 1500, boostSats: 800 },
    { date: '2025-06-19', streamSats: 2000, boostSats: 600 },
    { date: '2025-06-20', streamSats: 1800, boostSats: 500 },
    { date: '2025-06-21', streamSats: 1200, boostSats: 900 },
    { date: '2025-06-22', streamSats: 0, boostSats: 0 }
  ];
  
  await postWeeklySummary();
  
  // Restore original data
  weeklyStats.streamSats = originalWeeklyStats.streamSats;
  weeklyStats.boostSats = originalWeeklyStats.boostSats;
  weeklyStats.streamShows = originalWeeklyStats.streamShows;
  weeklyStats.boostShows = originalWeeklyStats.boostShows;
  weeklyStats.dailyBreakdown = originalWeeklyStats.dailyBreakdown;
  
  // Save the restored real data
  await saveWeeklyStats();
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
  
  // Load daily and weekly stats on first run
  if (dailyStats.streamSats === 0 && dailyStats.boostSats === 0 && dailyStats.streamShows.size === 0) {
    await loadDailyStats();
    await loadWeeklyStats();
    await loadBoostSessions();
    await loadSupportedCreators();
  }

  // Check if we need to reset daily stats (new day in Eastern Time)
  const currentDateET = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
  if (currentDateET !== dailyStats.date) {
    await postDailySummary(); // Post previous day's summary
    await resetDailyStats();
  }

  // Check if we need to reset weekly stats (new week)
  const currentWeekStart = getWeekStart(new Date());
  if (currentWeekStart !== weeklyStats.weekStart) {
    await postWeeklySummary(); // Post previous week's summary
    await resetWeeklyStats();
  }

  // Track all payments for daily summary
  const showName = event.podcast && event.podcast.trim() && event.podcast.trim().toLowerCase() !== 'nameless' 
    ? event.podcast 
    : (event.episode && event.episode.trim() && event.episode.trim().toLowerCase() !== 'nameless' ? event.episode : 'Unknown');

  const satsAmount = Math.floor(event.value_msat_total / 1000);
  const hasMessage = event.message && event.message.trim() && event.message.trim() !== '';
  const isLargePayment = satsAmount >= 1000;
  
  if (event.action === 1) { // Stream
    dailyStats.streamSats += satsAmount;
    dailyStats.streamShows.add(showName);
    weeklyStats.streamSats += satsAmount;
    weeklyStats.streamShows.add(showName);
    logger.info(`Added ${satsAmount} stream sats to daily/weekly totals`);
  } else if (event.action === 2) { // Boost
    dailyStats.boostSats += satsAmount;
    dailyStats.boostShows.add(showName);
    weeklyStats.boostSats += satsAmount;
    weeklyStats.boostShows.add(showName);
    logger.info(`Added ${satsAmount} boost sats to daily/weekly totals`);
    
    // Track supported creators for boosts
    if (showName && showName !== 'Unknown') {
      // Check if this is a music boost
      const isMusic = event.remote_podcast && event.remote_podcast.trim() && 
                      event.remote_episode && event.remote_episode.trim();
      
      if (isMusic) {
        // Track the musician
        await trackSupportedCreator(event.remote_podcast, 'musician', satsAmount);
      } else {
        // Track the podcast
        await trackSupportedCreator(showName, 'podcast', satsAmount);
      }
    }
  }
  
  // Auto-save for large payments or payments with messages
  if (isLargePayment || hasMessage) {
    await saveDailyStats();
    await saveWeeklyStats();
    logger.info(`Auto-saved: ${isLargePayment ? 'large payment' : 'has message'} (${satsAmount} sats)`);
  }

  // Schedule daily/weekly summaries and hourly saves if not already scheduled
  if (!dailySummaryTimeout) {
    scheduleDailySummary();
    scheduleWeeklySummary();
    scheduleHourlySave();
  }

  // Only continue with individual boost posts for action === 2 (boosts)
  if (event.action !== 2) {
    return; // Skip individual posts for streams
  }

  // Determine if this is a sent or received boost
  // Sent boosts: sender is "ChadF" AND has payment fees
  // Received boosts: sender is NOT "ChadF" (someone else sent to you)
  const isSentBoost = event.sender === 'ChadF' && 
                      event.payment_info && 
                      event.payment_info.fee_msat && 
                      event.payment_info.fee_msat > 0;
  
  if (isSentBoost) {
    logger.info(`✅ Processing SENT boost (sender=ChadF + has fees)`, { 
      sender: event.sender, 
      amount: event.value_msat_total / 1000,
      feeAmount: event.payment_info.fee_msat
    });
  } else {
    // Skip ALL "received" boosts where sender is ChadF (even if no fees detected)
    // ChadF's boosts should only be posted as "sent" to avoid duplicates
    if (event.sender === 'ChadF') {
      logger.info(`⏭️ Skipping ChadF boost as received (ChadF boosts only post as sent)`, { 
        sender: event.sender, 
        amount: event.value_msat_total / 1000,
        hasFee: !!event.payment_info?.fee_msat,
        feeAmount: event.payment_info?.fee_msat || 0
      });
      return;
    }
    
    logger.info(`📨 Processing RECEIVED boost (from other sender)`, { 
      sender: event.sender, 
      amount: event.value_msat_total / 1000,
      hasFee: !!event.payment_info?.fee_msat,
      feeAmount: event.payment_info?.fee_msat || 0
    });
  }

  // For sent boosts, only post boosts from ChadF to avoid posting pseudonymous boosts
  if (isSentBoost && event.sender !== 'ChadF') {
    logger.info(`Skipping sent boost from different sender`, { 
      sender: event.sender, 
      amount: event.value_msat_total / 1000
    });
    return; // Skip sent boosts not from ChadF
  }

  // For sent boosts, blocklist of bot accounts - don't repost boosts sent to these accounts
  if (isSentBoost) {
    const blockedBotPubkeys = [
      'npub1x9txy0vttevqznkzfrl8f8u950lpy70tesd0hg7lfswmcfff9uasat8dz9', // Bot account
    ];
    
    // Check if boost was sent to a blocked bot account
    if (event.payment_info?.pubkey) {
      try {
        // Convert hex pubkey to npub for comparison
        const pubkeyBytes = new Uint8Array(Buffer.from(event.payment_info.pubkey, 'hex'));
        const recipientNpub = nip19.encode('npub', pubkeyBytes);
        if (blockedBotPubkeys.includes(recipientNpub)) {
          logger.info(`Skipping sent boost to blocked bot account`, { 
            sender: event.sender, 
            recipient: recipientNpub,
            amount: event.value_msat_total / 1000
          });
          return; // Skip sent boosts to blocked bot accounts
        }
      } catch (error) {
        logger.debug('Error checking recipient pubkey against blocklist', { error: error.message });
      }
    }
  }

  // Group splits by a wider time window to catch all splits from the same boost
  const timeWindow = Math.floor(event.time / 120); // 2-minute windows to prevent split sessions
  // For self-boosts (ChadF with fees), don't separate sent/received - use unified session
  const boostType = isSentBoost ? 'sent' : 'received';
  const sessionId = `${timeWindow}-${boostType}-${event.sender}-${event.episode}-${event.podcast}`;
  
  logger.info(`Processing payment`, { 
    amount: event.value_msat / 1000, 
    total: event.value_msat_total / 1000, 
    session: sessionId 
  });
  
  // Check if we already posted for this boost session
  if (postedBoosts.has(sessionId)) {
    logger.info(`Already posted for boost session ${sessionId}, skipping`);
    return;
  }

  // Get or create session entry
  const existingSession = boostSessions.get(sessionId);
  
  if (existingSession) {
    // Clear the previous timeout
    clearTimeout(existingSession.timeout);
    
    // Update if this split is larger
    if (event.value_msat > existingSession.largestSplit.value_msat) {
      existingSession.largestSplit = event;
      logger.info(`Updated largest split for session ${sessionId}`, { 
        amount: event.value_msat / 1000, 
        total: event.value_msat_total / 1000 
      });
    } else {
      logger.info(`Keeping existing largest split for session ${sessionId}`, { 
        amount: existingSession.largestSplit.value_msat / 1000 
      });
    }
  } else {
    // First split for this session
    boostSessions.set(sessionId, { largestSplit: event, timeout: setTimeout(() => {}, 0) });
    logger.info(`New boost session ${sessionId}`, { 
      amount: event.value_msat / 1000, 
      total: event.value_msat_total / 1000 
    });
  }

  // Set a timeout to post the largest payment after 30 seconds of no new payments
  // Longer delay for streaming to collect more payments in the session
  const session = boostSessions.get(sessionId)!;
  session.timeout = setTimeout(async () => {
    logger.info(`Posting largest payment for session ${sessionId}`, { 
      amount: session.largestSplit.value_msat / 1000, 
      total: session.largestSplit.value_msat_total / 1000 
    });
    
    // Mark this session as posted
    postedBoosts.add(sessionId);
    boostSessions.delete(sessionId);
    
    // Post the largest payment from this session
    try {
      const isSessionSentBoost = session.largestSplit.payment_info && 
                                session.largestSplit.payment_info.fee_msat && 
                                session.largestSplit.payment_info.fee_msat > 0;
      
      // Debug logging to trace the conditional logic
      logger.info('Conditional logic debug', {
        sessionId,
        sender: session.largestSplit.sender,
        hasPaymentInfo: !!session.largestSplit.payment_info,
        paymentInfo: session.largestSplit.payment_info,
        isSessionSentBoost,
        willCallFunction: isSessionSentBoost ? 'postBoostToNostr' : 'postReceivedBoostToNostr'
      });
      
      if (isSessionSentBoost) {
        await postBoostToNostr(session.largestSplit, bot);
      } else {
        await postReceivedBoostToNostr(session.largestSplit, bot);
      }
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
  'THE BITCOIN BRIEF': [
    'npub1lqvv69u549atefvcyfht30lemlyvl9jnz4l7c6ejs20yzpq7hh7sjjfx0r', // Max
    'npub15c88nc8d44gsp4658dnfu5fahswzzu8gaxm5lkuwjud068swdqfspxssvx', // QnA
  ],
  'MONERO MONTHLY': [
    'npub1lqvv69u549atefvcyfht30lemlyvl9jnz4l7c6ejs20yzpq7hh7sjjfx0r', // Max
    'npub1tr4dstaptd2sp98h7hlysp8qle6mw7wmauhfkgz3rmxdd8ndprusnw2y5g', // Seth for Privacy
  ],
  'Pleb Miner Monthly': [
    'npub1lqvv69u549atefvcyfht30lemlyvl9jnz4l7c6ejs20yzpq7hh7sjjfx0r', // Max
    'npub1luwkteu2eq2e97n7hw0tlj03vvgguzl0srm3vkxz2jt75wpaf9tspt9cqr', // Jon
  ],
  'ACTION NEWS': [
    'npub1lqvv69u549atefvcyfht30lemlyvl9jnz4l7c6ejs20yzpq7hh7sjjfx0r', // Max
    'npub1luwkteu2eq2e97n7hw0tlj03vvgguzl0srm3vkxz2jt75wpaf9tspt9cqr', // Jon
  ],
  'The Confab': [
    'npub1lqvv69u549atefvcyfht30lemlyvl9jnz4l7c6ejs20yzpq7hh7sjjfx0r', // Max
  ],
  'ASHIGARU': [
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

async function postReceivedBoostToNostr(event: HelipadPaymentEvent, bot: any): Promise<void> {
  logger.info('Starting to post received boost to Nostr', { 
    sender: event.sender, 
    amount: event.value_msat_total / 1000, 
    podcast: event.podcast, 
    episode: event.episode 
  });
  
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
  if (event.podcast) {
    showTags = getShowBasedTags(event.podcast);
  }

  // Build app info with link if available
  const appName = event.app || '';
  const appConfig = podcastAppLinks[appName];
  const appInfo = appConfig 
    ? `📱 Via: ${appConfig.url}`
    : `📱 Via: ${appName}`;

  // Format the content for received boost
  const contentParts = [
    '🎉 Thank you for the boost!',
    '',
  ];

  if (displayMessage && displayMessage.trim()) {
    contentParts.push(`💬 "${displayMessage}"`, '');
  }

  contentParts.push(`👤 From: ${event.sender || 'Unknown'}`);
  
  // Add show info
  if (event.podcast && event.podcast.trim() && event.podcast.trim().toLowerCase() !== 'nameless') {
    contentParts.push(`🎧 Show: ${event.podcast}`);
  }
  if (event.episode && event.episode.trim() && event.episode.trim().toLowerCase() !== 'nameless') {
    contentParts.push(`📻 Episode: ${event.episode}`);
  }

  contentParts.push(
    `💸 Amount: ${(event.value_msat_total / 1000).toLocaleString()} sats`,
    appInfo,
    '',
    '#ThankYou #BoostReceived #Podcasting20 #V4V'
  );

  const content = contentParts.join('\n');

  // Combine hashtags with mention tags and show tags
  const allTags = [
    ['t', 'thankyou'],
    ['t', 'boostreceived'],
    ['t', 'podcasting20'],
    ['t', 'v4v'],
    ['t', 'podcast'],
    ...messageTags,
    ...showTags
  ];

  const nostrEvent = finalizeEvent({
    kind: 1,
    content,
    tags: allTags,
    created_at: Math.floor(Date.now() / 1000),
  }, bot.getSecretKey());

  await bot.publishToRelays(nostrEvent);
  
  logger.info('Successfully posted received boost to Nostr', { 
    sender: event.sender, 
    amount: event.value_msat_total / 1000, 
    contentLength: content.length,
    tagsCount: allTags.length
  });
}

async function postBoostToNostr(event: HelipadPaymentEvent, bot: any): Promise<void> {
  logger.info('Starting to post boost to Nostr', { 
    sender: event.sender, 
    amount: event.value_msat_total / 1000, 
    podcast: event.podcast, 
    episode: event.episode 
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
      const feedID = tlvData.feedID;
      
      // Link to show page (has all episodes + app chooser + episodes.fm button)
      if (feedID) {
        showLink = `https://podcastindex.org/podcast/${feedID}`;
      }
    }
  } catch (error) {
    console.warn('⚠️ Failed to parse TLV data for show link:', error);
  }

  // Check if this is a music boost (has remote_podcast and remote_episode)
  const isMusic = event.remote_podcast && event.remote_podcast.trim() && 
                  event.remote_episode && event.remote_episode.trim();

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

  // Format the content for Nostr
  const contentParts = [
    actionText,
    '',
  ];

  if (displayMessage && displayMessage.trim()) {
    contentParts.push(`💬 Message: ${displayMessage}`, '');
  }

  contentParts.push(`${senderLabel}: ${senderDisplay || 'Unknown'}`);

  // Add visible host mentions if any
  if (showHostMentions.length > 0) {
    contentParts.push(`👥 Hosts: ${showHostMentions.join(' ')}`);
  }

  // Build app info with link if available
  const appName = event.app || '';
  const appConfig = podcastAppLinks[appName];
  const appInfo = appConfig 
    ? `📱 App: ${appConfig.url}`
    : `📱 App: ${appName}`;

  if (isMusic) {
    // Music boost - show the hosting show and the music track
    if (event.podcast && event.podcast.trim() && event.podcast.trim().toLowerCase() !== 'nameless') {
      const showInfo = event.episode && event.episode.trim() && event.episode.trim().toLowerCase() !== 'nameless' 
        ? `${event.podcast} - ${event.episode}` 
        : event.podcast;
      contentParts.push(`🎧 Show: ${showInfo}`);
    }
    contentParts.push(`🎵 Now Playing: "${event.remote_episode}" by ${event.remote_podcast}`);
  } else {
    // Regular podcast boost - show podcast and episode info
    if (event.podcast && event.podcast.trim() && event.podcast.trim().toLowerCase() !== 'nameless') {
      contentParts.push(`🎧 Podcast: ${event.podcast}`);
    }
    if (event.episode && event.episode.trim() && event.episode.trim().toLowerCase() !== 'nameless') {
      contentParts.push(`📻 Episode: ${event.episode}`);
    }
  }

  contentParts.push(
    `💸 Amount: ${(event.value_msat_total / 1000).toLocaleString()} sats`
  );

  // Add show link if available
  if (showLink) {
    contentParts.push(`🎧 Listen: ${showLink}`);
  }
  
  contentParts.push(appInfo);

  contentParts.push(
    '',
    '#Boostagram #Podcasting20 #PC20 #V4V'
  );

  const content = contentParts.join('\n');

  // Combine hashtags with mention tags and show tags
  const allTags = [
    ['t', 'boostagram'],
    ['t', 'podcasting20'],
    ['t', 'pc20'],
    ['t', 'v4v'],
    ['t', 'podcast'],
    ...messageTags,
    ...showTags
  ];

  const nostrEvent = finalizeEvent({
    kind: 1,
    content,
    tags: allTags,
    created_at: Math.floor(Date.now() / 1000),
  }, bot.getSecretKey());

  await bot.publishToRelays(nostrEvent);
  
  logger.info('Successfully posted boost to Nostr', { 
    sender: event.sender, 
    amount: event.value_msat_total / 1000, 
    contentLength: content.length,
    tagsCount: allTags.length
  });
}