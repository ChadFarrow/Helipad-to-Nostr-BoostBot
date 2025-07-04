import { promises as fs } from 'fs';
import path from 'path';
import { logger } from './logger.js';

// Karma entity types
export type KarmaEntityType = 'person' | 'show' | 'track';

// Karma entity interface
export interface KarmaEntity {
  id: string;           // Unique identifier (npub for people, show name for shows, track name for tracks)
  name: string;         // Display name
  type: KarmaEntityType;
  karma: number;        // Current karma count
  firstSeen: string;    // ISO date when first boosted
  lastSeen: string;     // ISO date when last boosted
  totalBoosts: number;  // Total number of boosts
  totalSats: number;    // Total sats sent
  npub?: string;        // For people, their npub
  showName?: string;    // For tracks, the hosting show
}

// Karma system interface
export interface KarmaSystem {
  [key: string]: KarmaEntity;
}

// File path for karma data
const KARMA_FILE = path.join(process.cwd(), 'karma-data.json');

// In-memory karma data
let karmaData: KarmaSystem = {};

/**
 * Load karma data from file
 */
export async function loadKarmaData(): Promise<void> {
  try {
    const data = await fs.readFile(KARMA_FILE, 'utf-8');
    karmaData = JSON.parse(data);
    logger.info(`📊 Loaded karma data for ${Object.keys(karmaData).length} entities`);
  } catch (error) {
    logger.info(`📊 No previous karma data found, starting fresh`);
    karmaData = {};
  }
}

/**
 * Save karma data to file
 */
export async function saveKarmaData(): Promise<void> {
  try {
    await fs.writeFile(KARMA_FILE, JSON.stringify(karmaData, null, 2));
  } catch (error) {
    logger.error(`❌ Failed to save karma data:`, error);
  }
}

/**
 * Generate a unique ID for a karma entity
 */
function generateEntityId(type: KarmaEntityType, name: string, npub?: string, showName?: string): string {
  switch (type) {
    case 'person':
      return npub || `person:${name.toLowerCase().replace(/\s+/g, '-')}`;
    case 'show':
      return `show:${name.toLowerCase().replace(/\s+/g, '-')}`;
    case 'track':
      const trackId = `track:${name.toLowerCase().replace(/\s+/g, '-')}`;
      return showName ? `${trackId}:${showName.toLowerCase().replace(/\s+/g, '-')}` : trackId;
    default:
      return `${type}:${name.toLowerCase().replace(/\s+/g, '-')}`;
  }
}

/**
 * Add or update karma for an entity
 */
export async function addKarma(
  type: KarmaEntityType,
  name: string,
  satsAmount: number,
  npub?: string,
  showName?: string
): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const entityId = generateEntityId(type, name, npub, showName);
  
  if (karmaData[entityId]) {
    // Update existing entity
    const entity = karmaData[entityId];
    entity.karma += 1;
    entity.lastSeen = today;
    entity.totalBoosts += 1;
    entity.totalSats += satsAmount;
    
    logger.info(`📈 Updated karma for ${type} "${name}": ${entity.karma} karma (+1)`);
  } else {
    // Create new entity
    karmaData[entityId] = {
      id: entityId,
      name,
      type,
      karma: 1,
      firstSeen: today,
      lastSeen: today,
      totalBoosts: 1,
      totalSats: satsAmount,
      npub,
      showName
    };
    
    logger.info(`🆕 New ${type} added to karma system: "${name}" (1 karma)`);
  }
  
  await saveKarmaData();
}

/**
 * Get karma for an entity
 */
export function getKarma(type: KarmaEntityType, name: string, npub?: string, showName?: string): KarmaEntity | null {
  const entityId = generateEntityId(type, name, npub, showName);
  return karmaData[entityId] || null;
}

/**
 * Get all karma entities, optionally filtered by type
 */
export function getAllKarma(type?: KarmaEntityType): KarmaEntity[] {
  const entities = Object.values(karmaData);
  if (type) {
    return entities.filter(entity => entity.type === type);
  }
  return entities;
}

/**
 * Get top karma entities by karma count
 */
export function getTopKarma(limit: number = 10, type?: KarmaEntityType): KarmaEntity[] {
  const entities = getAllKarma(type);
  return entities
    .sort((a, b) => b.karma - a.karma)
    .slice(0, limit);
}

/**
 * Get karma statistics
 */
export function getKarmaStats(): {
  totalEntities: number;
  totalKarma: number;
  totalBoosts: number;
  totalSats: number;
  byType: { [key in KarmaEntityType]: { count: number; karma: number; boosts: number; sats: number } };
} {
  const entities = Object.values(karmaData);
  const stats = {
    totalEntities: entities.length,
    totalKarma: entities.reduce((sum, entity) => sum + entity.karma, 0),
    totalBoosts: entities.reduce((sum, entity) => sum + entity.totalBoosts, 0),
    totalSats: entities.reduce((sum, entity) => sum + entity.totalSats, 0),
    byType: {
      person: { count: 0, karma: 0, boosts: 0, sats: 0 },
      show: { count: 0, karma: 0, boosts: 0, sats: 0 },
      track: { count: 0, karma: 0, boosts: 0, sats: 0 }
    }
  };
  
  entities.forEach(entity => {
    stats.byType[entity.type].count++;
    stats.byType[entity.type].karma += entity.karma;
    stats.byType[entity.type].boosts += entity.totalBoosts;
    stats.byType[entity.type].sats += entity.totalSats;
  });
  
  return stats;
}

/**
 * Process a boost event and add karma to relevant entities
 */
export async function processBoostForKarma(event: any): Promise<void> {
  const satsAmount = Math.floor(event.value_msat_total / 1000);
  
  // Always add karma for the show/podcast
  if (event.podcast && event.podcast.trim() && event.podcast.trim().toLowerCase() !== 'nameless') {
    await addKarma('show', event.podcast, satsAmount);
  }
  
  // Add karma for individual hosts (if we have their npubs)
  if (event.podcast) {
    // This would need to be integrated with your existing getShowNpubs function
    // For now, we'll add a placeholder that you can expand
    // const showNpubs = getShowNpubs(event.podcast);
    // for (const npub of showNpubs) {
    //   await addKarma('person', 'Host Name', satsAmount, npub);
    // }
  }
  
  // Add karma for tracks (episodes or music tracks)
  if (event.episode && event.episode.trim() && event.episode.trim().toLowerCase() !== 'nameless') {
    const trackName = event.episode;
    const showName = event.podcast;
    await addKarma('track', trackName, satsAmount, undefined, showName);
  }
  
  // Add karma for music tracks (remote_podcast/remote_episode)
  if (event.remote_podcast && event.remote_episode) {
    const trackName = event.remote_episode;
    const showName = event.remote_podcast;
    await addKarma('track', trackName, satsAmount, undefined, showName);
    
    // Also add karma for the musician (remote_podcast is usually the artist)
    await addKarma('person', event.remote_podcast, satsAmount);
  }
}

/**
 * Export karma data for backup or analysis
 */
export async function exportKarmaData(): Promise<string> {
  const stats = getKarmaStats();
  const topPeople = getTopKarma(10, 'person');
  const topShows = getTopKarma(10, 'show');
  const topTracks = getTopKarma(10, 'track');
  
  const exportData = {
    exportDate: new Date().toISOString(),
    stats,
    topPeople,
    topShows,
    topTracks,
    allData: karmaData
  };
  
  return JSON.stringify(exportData, null, 2);
} 