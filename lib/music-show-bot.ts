import { createNostrBot } from './nostr-bot.js';
import { logger } from './logger.js';

interface MusicShowEvent {
  timestamp: string;
  podcast: string;
  episode: string;
  remote_podcast?: string;
  remote_episode?: string;
  action: number;
  value_sat: number;
  sender: string;
  message?: string;
  app?: string; // Listening platform (CurioCaster, Castamatic, etc.)
  artist?: string;
  feedID?: number;
  remote_feed_guid?: string;
}

interface SongPlay {
  song: string;
  track: string;
  startTime: string;
  endTime?: string;
  totalSats: number;
  boostCount: number;
  streamCount: number;
  showName: string;
  episodeName: string;
  listeningPlatform: string;
  artist?: string;
  feedID?: number;
  remote_feed_guid?: string;
}

class MusicShowBot {
  private currentSong: SongPlay | null = null;
  private songHistory: SongPlay[] = [];
  private nostrBot: any | null = null;

  constructor() {
    // Don't create the Nostr bot immediately - wait until needed
  }

  private getNostrBot(): any | null {
    if (!this.nostrBot) {
      this.nostrBot = createNostrBot();
    }
    return this.nostrBot;
  }

  /**
   * Process a music show event and detect song transitions
   */
  async processMusicShowEvent(event: MusicShowEvent): Promise<void> {
    try {
      const { remote_podcast, remote_episode, action, value_sat, timestamp } = event;
      
      console.log('🎵 Processing music show event:', { 
        remote_podcast, 
        remote_episode, 
        action, 
        value_sat,
        currentSong: this.currentSong ? this.currentSong.song + ' - ' + this.currentSong.track : 'none'
      });
      
      // If we have song information, process it
      if (remote_podcast && remote_episode) {
        await this.handleSongEvent(event);
      } else {
        // General show activity (streaming without specific song)
        await this.handleShowActivity(event);
      }
    } catch (error) {
      logger.error('Error processing music show event:', error);
    }
  }

  /**
   * Handle events with specific song information
   */
  private async handleSongEvent(event: MusicShowEvent): Promise<void> {
    const { remote_podcast, remote_episode, action, value_sat, timestamp, artist, feedID } = event;
    
    // Ensure we have valid song data
    if (!remote_podcast || !remote_episode) {
      return;
    }

    // Check if this is a new song
    if (!this.currentSong || this.currentSong.song !== remote_podcast || this.currentSong.track !== remote_episode) {
      // Finish the previous song if it exists
      if (this.currentSong) {
        await this.finishSong(this.currentSong, timestamp);
      }

      // Start tracking the new song
      this.currentSong = {
        song: remote_podcast,
        track: remote_episode,
        startTime: timestamp,
        totalSats: 0,
        boostCount: 0,
        streamCount: 0,
        showName: event.podcast,
        episodeName: event.episode,
        listeningPlatform: event.app || 'Unknown',
        artist: artist,
        feedID: feedID,
        remote_feed_guid: event.remote_feed_guid
      };

      logger.info(`🎵 Started listening to: ${remote_podcast} - ${remote_episode} (Artist: ${artist || 'Unknown'})`);
    }

    // Update song statistics
    if (this.currentSong) {
      this.currentSong.totalSats += value_sat;
      if (action === 1) {
        this.currentSong.streamCount++;
      } else if (action === 2) {
        this.currentSong.boostCount++;
      }
    }
  }

  /**
   * Handle general show activity (streaming without specific song)
   */
  private async handleShowActivity(event: MusicShowEvent): Promise<void> {
    const { podcast, episode, action, value_sat, timestamp } = event;
    
    // If we have a current song and get general activity, it might mean the song ended
    if (this.currentSong) {
      // Check if enough time has passed since last song activity
      const lastSongTime = new Date(this.currentSong.startTime);
      const currentTime = new Date(timestamp);
      const timeDiff = currentTime.getTime() - lastSongTime.getTime();
      
      // If more than 2 minutes have passed, consider the song finished
      if (timeDiff > 2 * 60 * 1000) {
        await this.finishSong(this.currentSong, timestamp);
        this.currentSong = null;
      }
    }
  }

  /**
   * Post about a finished song to Nostr
   */
  private async finishSong(song: SongPlay, endTime: string): Promise<void> {
    try {
      song.endTime = endTime;
      this.songHistory.push(song);

      // Create the Nostr post
      const post = this.createSongPost(song);
      
      // Post to Nostr
      await this.postToNostr(post);
      
      logger.info(`✅ Posted about finished song: ${song.song} - ${song.track} (Artist: ${song.artist || 'Unknown'})`);
      
      // Log song statistics
      logger.info(`📊 Song stats: ${song.totalSats} sats, ${song.boostCount} boosts, ${song.streamCount} streams`);
      
    } catch (error) {
      logger.error('Error posting finished song to Nostr:', error);
    }
  }

  /**
   * Create the Nostr post content for a finished song
   */
  private createSongPost(song: SongPlay): string {
    // Clean artist name by removing "via Wavlake" and similar suffixes
    const cleanArtist = (song.artist || 'Unknown Artist').replace(/\s+via\s+\w+/i, '').trim();
    
    let post = `🎵 Just listened to ${song.song} by ${cleanArtist} on ${song.showName} - ${song.episodeName}\n\n`;
    if (song.remote_feed_guid) {
      post += `🎵 Listen: https://lnbeats.com/album/${song.remote_feed_guid}\n\n`;
    }
    post += `#V4Vmusic #PC20 #ValueVerse #LNBeats`;
    return post;
  }

  /**
   * Calculate duration between start and end times
   */
  private calculateDuration(startTime: string, endTime: string): string {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end.getTime() - start.getTime();
    
    const minutes = Math.floor(diffMs / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Get recent song history
   */
  getRecentSongs(limit: number = 10): SongPlay[] {
    return this.songHistory.slice(-limit).reverse();
  }

  /**
   * Get current song being listened to
   */
  getCurrentSong(): SongPlay | null {
    return this.currentSong;
  }

  /**
   * Post content to Nostr
   */
  private async postToNostr(content: string): Promise<void> {
    const bot = this.getNostrBot();
    if (!bot) {
      logger.error('Nostr bot not available');
      return;
    }

    try {
      // Use the bot's publish method directly
      const { finalizeEvent } = await import('nostr-tools');
      const sk = this.nostrBot.getSecretKey();
      
      const event = finalizeEvent({
        kind: 1,
        content,
        tags: [
          ['t', 'v4vmusic'],
          ['t', 'pc20'],
          ['t', 'valueverse'],
        ],
        created_at: Math.floor(Date.now() / 1000),
      }, sk);

      await this.nostrBot.publishToRelays(event);
    } catch (error) {
      logger.error('Error posting to Nostr:', error);
    }
  }

  /**
   * Get show statistics
   */
  getShowStats() {
    const totalSongs = this.songHistory.length;
    const totalSats = this.songHistory.reduce((sum, song) => sum + song.totalSats, 0);
    const totalBoosts = this.songHistory.reduce((sum, song) => sum + song.boostCount, 0);
    const totalStreams = this.songHistory.reduce((sum, song) => sum + song.streamCount, 0);

    return {
      totalSongs,
      totalSats,
      totalBoosts,
      totalStreams,
      averageSatsPerSong: totalSongs > 0 ? Math.round(totalSats / totalSongs) : 0
    };
  }
}

// Create and export a singleton instance
const musicShowBot = new MusicShowBot();

export { musicShowBot, MusicShowBot, type MusicShowEvent, type SongPlay }; 