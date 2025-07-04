import fs from 'fs';
import path from 'path';
import { logger } from './logger.js';

export interface KarmaEntity {
  id: string;
  name: string;
  type: 'person' | 'show' | 'track';
  karma: number;
  firstSeen: string;
  lastSeen: string;
  totalBoosts: number;
  totalSats: number;
  // Optional fields for tracks
  npub?: string;
  showName?: string;
}

export interface KarmaData {
  [key: string]: KarmaEntity;
}

class KarmaSystem {
  private dataPath: string;
  private data: KarmaData;

  constructor() {
    this.dataPath = path.join(process.cwd(), 'karma-data.json');
    this.data = this.loadData();
  }

  private loadData(): KarmaData {
    try {
      if (fs.existsSync(this.dataPath)) {
        const fileContent = fs.readFileSync(this.dataPath, 'utf8');
        const loadedData = JSON.parse(fileContent);
        
        // Check if data is in old nested format and migrate
        if (loadedData.entities) {
          logger.info('📊 Migrating karma data from old nested format');
          const migratedData = loadedData.entities;
          this.saveData();
          return migratedData;
        }
        
        logger.info(`📊 Loaded karma data for ${Object.keys(loadedData).length} entities`);
        return loadedData;
      } else {
        logger.info('📊 No previous karma data found, starting fresh');
        return {};
      }
    } catch (error) {
      logger.error('Error loading karma data:', error as any);
      return {};
    }
  }

  private saveData(): void {
    try {
      fs.writeFileSync(this.dataPath, JSON.stringify(this.data, null, 2));
    } catch (error) {
      logger.error('Error saving karma data:', error as any);
    }
  }

  private generateId(name: string, type: string): string {
    return `${type}:${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
  }

  public addKarma(name: string, type: 'person' | 'show' | 'track', amount: number = 1, sats: number = 0, metadata?: { npub?: string; showName?: string }): void {
    const id = this.generateId(name, type);
    const now = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    if (this.data[id]) {
      // Update existing entity
      const entity = this.data[id];
      entity.karma += amount;
      entity.lastSeen = now;
      entity.totalBoosts += 1;
      entity.totalSats += sats;
      
      // Update metadata for tracks
      if (type === 'track' && metadata) {
        if (metadata.npub) entity.npub = metadata.npub;
        if (metadata.showName) entity.showName = metadata.showName;
      }
      
      logger.info(`📈 Updated karma for ${type} "${name}": ${entity.karma} karma (+${amount})`);
    } else {
      // Create new entity
      const newEntity: KarmaEntity = {
        id,
        name,
        type,
        karma: amount,
        firstSeen: now,
        lastSeen: now,
        totalBoosts: 1,
        totalSats: sats
      };
      
      // Add metadata for tracks
      if (type === 'track' && metadata) {
        if (metadata.npub) newEntity.npub = metadata.npub;
        if (metadata.showName) newEntity.showName = metadata.showName;
      }
      
      this.data[id] = newEntity;
      
      logger.info(`🆕 New ${type} added to karma system: "${name}" (${amount} karma)`);
    }

    this.saveData();
  }

  public getKarma(name: string, type: 'person' | 'show' | 'track'): number {
    const id = this.generateId(name, type);
    return this.data[id]?.karma || 0;
  }

  public getEntity(name: string, type: 'person' | 'show' | 'track'): KarmaEntity | null {
    const id = this.generateId(name, type);
    return this.data[id] || null;
  }

  public getAllEntities(): KarmaEntity[] {
    return Object.values(this.data);
  }

  public getTopEntities(type?: 'person' | 'show' | 'track', limit: number = 10): KarmaEntity[] {
    let entities = this.getAllEntities();
    
    if (type) {
      entities = entities.filter(entity => entity.type === type);
    }
    
    return entities
      .sort((a, b) => b.karma - a.karma)
      .slice(0, limit);
  }

  public getLeaderboard(type?: 'person' | 'show' | 'track', limit: number = 10): string {
    const topEntities = this.getTopEntities(type, limit);
    
    if (topEntities.length === 0) {
      return `No ${type || 'entities'} found in karma system.`;
    }

    const typeLabel = type ? type.charAt(0).toUpperCase() + type.slice(1) + 's' : 'Entities';
    let leaderboard = `🏆 **${typeLabel} Karma Leaderboard**\n\n`;
    
    topEntities.forEach((entity, index) => {
      const emoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅';
      leaderboard += `${emoji} **${entity.name}** - ${entity.karma} karma (${entity.totalBoosts} boosts)\n`;
    });
    
    return leaderboard;
  }

  public getStats(): string {
    const entities = this.getAllEntities();
    const people = entities.filter(e => e.type === 'person');
    const shows = entities.filter(e => e.type === 'show');
    const tracks = entities.filter(e => e.type === 'track');
    
    const totalKarma = entities.reduce((sum, e) => sum + e.karma, 0);
    const totalBoosts = entities.reduce((sum, e) => sum + e.totalBoosts, 0);
    const totalSats = entities.reduce((sum, e) => sum + e.totalSats, 0);
    
    return `📊 **Karma System Stats**\n\n` +
           `👥 **People:** ${people.length} (${people.reduce((sum, p) => sum + p.karma, 0)} karma)\n` +
           `📻 **Shows:** ${shows.length} (${shows.reduce((sum, s) => sum + s.karma, 0)} karma)\n` +
           `🎵 **Tracks:** ${tracks.length} (${tracks.reduce((sum, t) => sum + t.karma, 0)} karma)\n\n` +
           `💫 **Total:** ${entities.length} entities, ${totalKarma} karma, ${totalBoosts} boosts, ${totalSats} sats`;
  }

  public resetKarma(): void {
    this.data = {};
    this.saveData();
    logger.info('🔄 Karma system reset');
  }
}

export const karmaSystem = new KarmaSystem(); 