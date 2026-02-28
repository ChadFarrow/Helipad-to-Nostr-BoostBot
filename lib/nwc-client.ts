// NWC (Nostr Wallet Connect) client for AlbyHub integration
// Subscribes to payment notifications via NIP-47 and transforms them
// into HelipadPaymentEvent format for the existing bot pipeline.

import { NWCClient } from '@getalby/sdk/nwc';
import type { Nip47Notification, Nip47Transaction } from '@getalby/sdk/nwc';
import { logger } from './logger.js';
import { announceHelipadPayment } from './nostr-bot.ts';
import type { HelipadPaymentEvent } from './nostr-bot.ts';

// TLV key for podcast boost metadata (Podcasting 2.0 boostagram)
const BOOSTAGRAM_TLV_KEY = 7629169;

// Track processed payment hashes to avoid duplicates (with Helipad running too)
const processedPaymentHashes = new Set<string>();
const MAX_PROCESSED_CACHE = 5000;

// Auto-incrementing index for NWC events
let nwcEventIndex = 100000;

interface BoostagramData {
  podcast?: string;
  episode?: string;
  action?: string | number;
  sender_name?: string;
  sender_id?: string;
  message?: string;
  app_name?: string;
  app?: string;
  feedID?: number;
  guid?: string;
  episode_guid?: string;
  value_msat_total?: number;
  value_msat?: number;
  name?: string;
  remote_podcast?: string;
  remote_episode?: string;
  remote_feed_guid?: string;
  remote_item_guid?: string;
  url?: string;
  boost_link?: string;
  ts?: number;
  speed?: string;
  [key: string]: unknown;
}

/**
 * Decode a hex string to UTF-8 text
 */
function hexToUtf8(hex: string): string {
  const bytes = new Uint8Array(hex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
  return new TextDecoder().decode(bytes);
}

/**
 * Extract boostagram data from NWC transaction TLV records
 */
function extractBoostagram(transaction: Nip47Transaction): BoostagramData | null {
  const metadata = transaction.metadata as Record<string, unknown> | undefined;
  if (!metadata) return null;

  // Look for tlv_records in metadata
  const tlvRecords = metadata.tlv_records as Array<{ type: number; value: string }> | undefined;
  if (!tlvRecords || !Array.isArray(tlvRecords)) return null;

  // Find the boostagram TLV record (key 7629169)
  const boostagramRecord = tlvRecords.find(r => r.type === BOOSTAGRAM_TLV_KEY);
  if (!boostagramRecord) return null;

  try {
    const jsonString = hexToUtf8(boostagramRecord.value);
    const boostagram = JSON.parse(jsonString) as BoostagramData;
    return boostagram;
  } catch (error: any) {
    logger.error('Failed to decode boostagram TLV', {
      error: error?.message,
      value: boostagramRecord.value.substring(0, 100)
    });
    return null;
  }
}

/**
 * Convert a NWC action string to Helipad action number
 */
function actionToNumber(action: string | number | undefined): number {
  if (typeof action === 'number') return action;
  switch (action?.toLowerCase()) {
    case 'stream': return 1;
    case 'boost': return 2;
    case 'auto': return 4;
    default: return 3; // Unknown
  }
}

/**
 * Transform an NWC transaction + boostagram into a HelipadPaymentEvent
 */
function transformToHelipadEvent(
  transaction: Nip47Transaction,
  boostagram: BoostagramData,
  isOutgoing: boolean
): HelipadPaymentEvent {
  const totalMsat = boostagram.value_msat_total || transaction.amount;
  const splitMsat = boostagram.value_msat || transaction.amount;

  // Reconstruct the TLV string that the existing code expects
  const tlvData: Record<string, unknown> = { ...boostagram };
  // Remove top-level fields that are already on the event
  delete tlvData.podcast;
  delete tlvData.episode;
  delete tlvData.message;
  delete tlvData.sender_name;

  return {
    index: nwcEventIndex++,
    time: transaction.settled_at || transaction.created_at || Math.floor(Date.now() / 1000),
    value_msat: splitMsat,
    value_msat_total: totalMsat,
    action: actionToNumber(boostagram.action),
    sender: boostagram.sender_name || '',
    app: boostagram.app_name || boostagram.app || '',
    message: boostagram.message || '',
    podcast: boostagram.podcast || '',
    episode: boostagram.episode || '',
    tlv: JSON.stringify(tlvData),
    remote_podcast: boostagram.remote_podcast,
    remote_episode: boostagram.remote_episode,
    _source: 'nwc',
    payment_info: {
      payment_hash: transaction.payment_hash || '',
      pubkey: '',
      custom_key: BOOSTAGRAM_TLV_KEY,
      custom_value: '',
      // Outgoing payments have routing fees; this is what triggers posting in the bot
      fee_msat: isOutgoing ? (transaction.fees_paid || 1) : 0,
      reply_to_idx: null,
    },
  };
}

/**
 * Handle an incoming NWC notification
 */
async function handleNotification(
  notification: Nip47Notification,
  onActivity?: (event: HelipadPaymentEvent, source: string) => void
): Promise<void> {
  const transaction = notification.notification;
  const isOutgoing = notification.notification_type === 'payment_sent';
  const direction = isOutgoing ? 'outgoing' : 'incoming';

  logger.info(`NWC ${direction} payment`, {
    amount: transaction.amount / 1000,
    payment_hash: transaction.payment_hash?.substring(0, 16) + '...',
    state: transaction.state,
  });

  // Only process settled payments
  if (transaction.state !== 'settled') {
    logger.info(`NWC: Skipping non-settled payment (state: ${transaction.state})`);
    return;
  }

  // Deduplicate with Helipad (if both sources are running)
  if (transaction.payment_hash && processedPaymentHashes.has(transaction.payment_hash)) {
    logger.info(`NWC: Skipping duplicate payment_hash ${transaction.payment_hash.substring(0, 16)}...`);
    return;
  }

  // Extract boostagram from TLV records
  const boostagram = extractBoostagram(transaction);
  if (!boostagram) {
    logger.info(`NWC: Payment has no boostagram TLV data, skipping`, {
      amount: transaction.amount / 1000,
      description: transaction.description?.substring(0, 50),
    });
    return;
  }

  // Track this payment hash
  if (transaction.payment_hash) {
    processedPaymentHashes.add(transaction.payment_hash);
    // Prune cache if too large
    if (processedPaymentHashes.size > MAX_PROCESSED_CACHE) {
      const iterator = processedPaymentHashes.values();
      for (let i = 0; i < 1000; i++) {
        processedPaymentHashes.delete(iterator.next().value!);
      }
    }
  }

  // Transform to HelipadPaymentEvent format
  const event = transformToHelipadEvent(transaction, boostagram, isOutgoing);

  logger.info(`NWC: Processing boostagram`, {
    direction,
    action: event.action,
    sender: event.sender,
    podcast: event.podcast,
    episode: event.episode,
    amount_sats: event.value_msat_total / 1000,
    message: event.message?.substring(0, 50),
  });

  // Notify activity callback (for dashboard/monitors)
  if (onActivity) {
    onActivity(event, 'nwc');
  }

  // Route through existing pipeline
  try {
    await announceHelipadPayment(event);
  } catch (error: any) {
    logger.error('NWC: Error in announceHelipadPayment', {
      error: error?.message,
      payment_hash: transaction.payment_hash?.substring(0, 16),
    });
  }
}

/**
 * Mark a payment hash as already processed (for Helipad deduplication)
 */
export function markPaymentProcessed(paymentHash: string): void {
  processedPaymentHashes.add(paymentHash);
}

/**
 * Start the NWC client and subscribe to payment notifications
 */
export async function startNWCClient(options: {
  nwcUrl: string;
  onActivity?: (event: HelipadPaymentEvent, source: string) => void;
}): Promise<{ close: () => void }> {
  const { nwcUrl, onActivity } = options;

  logger.info('NWC: Connecting to AlbyHub...');

  const nwcClient = new NWCClient({
    nostrWalletConnectUrl: nwcUrl,
  });

  // Check wallet info and capabilities
  try {
    const info = await nwcClient.getInfo();
    logger.info('NWC: Connected to wallet', {
      alias: info.alias,
      network: info.network,
      methods: info.methods?.join(', '),
      notifications: info.notifications?.join(', '),
    });
  } catch (error: any) {
    logger.warn('NWC: Could not fetch wallet info (continuing anyway)', {
      error: error?.message,
    });
  }

  // Subscribe to payment notifications
  let unsubscribe: (() => void) | null = null;
  try {
    unsubscribe = await nwcClient.subscribeNotifications(
      (notification: Nip47Notification) => {
        handleNotification(notification, onActivity).catch(err => {
          logger.error('NWC: Unhandled error in notification handler', {
            error: err?.message,
          });
        });
      },
      ['payment_received', 'payment_sent']
    );
    logger.info('NWC: Subscribed to payment notifications (payment_received + payment_sent)');
  } catch (error: any) {
    logger.error('NWC: Failed to subscribe to notifications', {
      error: error?.message,
    });
    // Fall back to polling
    logger.info('NWC: Will use polling fallback');
  }

  // Polling fallback - check for recent transactions periodically
  let pollInterval: NodeJS.Timeout | null = null;
  let lastPollTime = Math.floor(Date.now() / 1000);

  if (!unsubscribe) {
    logger.info('NWC: Starting polling fallback (every 30 seconds)');
    pollInterval = setInterval(async () => {
      try {
        const now = Math.floor(Date.now() / 1000);
        const response = await nwcClient.listTransactions({
          from: lastPollTime,
          until: now,
          limit: 50,
        });
        lastPollTime = now;

        for (const tx of response.transactions) {
          const isOutgoing = tx.type === 'outgoing';
          const fakeNotification: Nip47Notification = isOutgoing
            ? { notification_type: 'payment_sent', notification: tx }
            : { notification_type: 'payment_received', notification: tx };
          await handleNotification(fakeNotification, onActivity);
        }
      } catch (error: any) {
        logger.error('NWC: Polling error', { error: error?.message });
      }
    }, 30000);
  }

  return {
    close: () => {
      logger.info('NWC: Shutting down...');
      if (unsubscribe) unsubscribe();
      if (pollInterval) clearInterval(pollInterval);
      nwcClient.close();
      logger.info('NWC: Disconnected');
    },
  };
}
