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
  boostCount: number;
}

export interface KarmaData {
  entities: { [key: string]: KarmaEntity };
  lastUpdated: string;
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
        logger.info(`📊 Loaded karma data for ${Object.keys(loadedData.entities || {}).length} entities`);
        return loadedData;
      } else {
        logger.info('📊 No previous karma data found, starting fresh');
        return {
          entities: {},
          lastUpdated: new Date().toISOString()
        };
      }
    } catch (error) {
      logger.error('Error loading karma data:', error);
      return {
        entities: {},
        lastUpdated: new Date().toISOString()
      };
    }
  }

  private saveData(): void {
    try {
      this.data.lastUpdated = new Date().toISOString();
      fs.writeFileSync(this.dataPath, JSON.stringify(this.data, null, 2));
    } catch (error) {
      logger.error('Error saving karma data:', error);
    }
  }

  private generateId(name: string, type: string): string {
    return `${type}:${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
  }

  public addKarma(name: string, type: 'person' | 'show' | 'track', amount: number = 1): void {
    const id = this.generateId(name, type);
    const now = new Date().toISOString();

    if (this.data.entities[id]) {
      // Update existing entity
      const entity = this.data.entities[id];
      const oldKarma = entity.karma;
      entity.karma += amount;
      entity.lastSeen = now;
      entity.boostCount += 1;
      
      logger.info(`📈 Updated karma for ${type} "${name}": ${entity.karma} karma (+${amount})`);
    } else {
      // Create new entity
      this.data.entities[id] = {
        id,
        name,
        type,
        karma: amount,
        firstSeen: now,
        lastSeen: now,
        boostCount: 1
      };
      
      logger.info(`🆕 New ${type} added to karma system: "${name}" (${amount} karma)`);
    }

    this.saveData();
  }

  public getKarma(name: string, type: 'person' | 'show' | 'track'): number {
    const id = this.generateId(name, type);
    return this.data.entities[id]?.karma || 0;
  }

  public getEntity(name: string, type: 'person' | 'show' | 'track'): KarmaEntity | null {
    const id = this.generateId(name, type);
    return this.data.entities[id] || null;
  }

  public getAllEntities(): KarmaEntity[] {
    return Object.values(this.data.entities);
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
      leaderboard += `${emoji} **${entity.name}** - ${entity.karma} karma (${entity.boostCount} boosts)\n`;
    });
    
    return leaderboard;
  }

  public getStats(): string {
    const entities = this.getAllEntities();
    const people = entities.filter(e => e.type === 'person');
    const shows = entities.filter(e => e.type === 'show');
    const tracks = entities.filter(e => e.type === 'track');
    
    const totalKarma = entities.reduce((sum, e) => sum + e.karma, 0);
    const totalBoosts = entities.reduce((sum, e) => sum + e.boostCount, 0);
    
    return `📊 **Karma System Stats**\n\n` +
           `👥 **People:** ${people.length} (${people.reduce((sum, p) => sum + p.karma, 0)} karma)\n` +
           `📻 **Shows:** ${shows.length} (${shows.reduce((sum, s) => sum + s.karma, 0)} karma)\n` +
           `🎵 **Tracks:** ${tracks.length} (${tracks.reduce((sum, t) => sum + t.karma, 0)} karma)\n\n` +
           `💫 **Total:** ${entities.length} entities, ${totalKarma} karma, ${totalBoosts} boosts`;
  }

  public resetKarma(): void {
    this.data = {
      entities: {},
      lastUpdated: new Date().toISOString()
    };
    this.saveData();
    logger.info('🔄 Karma system reset');
  }
}

export const karmaSystem = new KarmaSystem(); 