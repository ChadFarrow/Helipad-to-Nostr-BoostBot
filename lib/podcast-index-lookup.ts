import { logger } from './logger.js';
import crypto from 'crypto';

export interface TrackInfo {
  title?: string;
  artist?: string;
  album?: string;
  feedTitle?: string;
}

/**
 * Enhanced Podcast Index API lookup that retrieves both track and artist information
 */
export async function lookupTrackInfoByGUID(
  guid: string,
  feedId?: number,
  podcastGuid?: string
): Promise<TrackInfo | null> {
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

    // First, try to get episode info
    let episodeUrl: string;
    if (podcastGuid) {
      episodeUrl = `https://api.podcastindex.org/api/1.0/episodes/byguid?guid=${encodeURIComponent(guid)}&podcastguid=${encodeURIComponent(podcastGuid)}`;
      logger.info(`🔍 Looking up track info: ${guid} (podcastGuid: ${podcastGuid})`);
    } else if (feedId) {
      episodeUrl = `https://api.podcastindex.org/api/1.0/episodes/byguid?guid=${encodeURIComponent(guid)}&feedid=${feedId}`;
      logger.info(`🔍 Looking up track info: ${guid} (feedId: ${feedId})`);
    } else {
      logger.warn('No feedId or podcastGuid provided for lookup');
      return null;
    }

    const episodeResponse = await fetch(episodeUrl, {
      headers: {
        'User-Agent': 'BoostBot/1.0',
        'X-Auth-Date': apiTime.toString(),
        'X-Auth-Key': apiKey,
        'Authorization': hash
      }
    });

    if (!episodeResponse.ok) {
      logger.warn(`Podcast Index API error: ${episodeResponse.status} ${episodeResponse.statusText}`);
      return null;
    }

    const episodeData = await episodeResponse.json() as any;

    if (episodeData.status !== 'true' || !episodeData.episode) {
      logger.warn(`No episode found for GUID: ${guid}`);
      return null;
    }

    const episode = episodeData.episode;
    const result: TrackInfo = {
      title: episode.title
    };

    // Try to get feed info for artist name
    if (feedId || episode.feedId) {
      const feedUrl = `https://api.podcastindex.org/api/1.0/podcasts/byfeedid?id=${feedId || episode.feedId}`;
      
      try {
        const feedResponse = await fetch(feedUrl, {
          headers: {
            'User-Agent': 'BoostBot/1.0',
            'X-Auth-Date': apiTime.toString(),
            'X-Auth-Key': apiKey,
            'Authorization': hash
          }
        });

        if (feedResponse.ok) {
          const feedData = await feedResponse.json() as any;
          if (feedData.status === 'true' && feedData.feed) {
            // For music feeds, the author is often the artist
            result.artist = feedData.feed.author || feedData.feed.title;
            result.album = feedData.feed.title;
            result.feedTitle = feedData.feed.title;
            
            logger.info(`✅ Found complete track info: "${result.title}" by ${result.artist}`);
          }
        }
      } catch (feedError) {
        logger.warn('Error fetching feed info', { error: feedError });
      }
    }

    // If we still don't have an artist, try to parse it from the title
    if (!result.artist && result.title) {
      // Common patterns: "Artist - Song", "Song by Artist"
      if (result.title.includes(' - ')) {
        const parts = result.title.split(' - ');
        if (parts.length === 2) {
          result.artist = parts[0].trim();
          result.title = parts[1].trim();
        }
      } else if (result.title.includes(' by ')) {
        const parts = result.title.split(' by ');
        if (parts.length === 2) {
          result.title = parts[0].trim();
          result.artist = parts[1].trim();
        }
      }
    }

    return result;
  } catch (error: any) {
    logger.error('Error looking up track info', {
      error: error?.message,
      guid,
      feedId,
      podcastGuid
    });
    return null;
  }
}

/**
 * Look up artist name from Podcast Index - tries multiple strategies
 */
export async function lookupArtistName(
  feedId?: number,
  podcastGuid?: string,
  episodeGuid?: string
): Promise<string | null> {
  // If we have episode info, try the enhanced lookup first
  if (episodeGuid && (feedId || podcastGuid)) {
    const trackInfo = await lookupTrackInfoByGUID(episodeGuid, feedId, podcastGuid);
    if (trackInfo?.artist) {
      return trackInfo.artist;
    }
  }

  // Fallback to just feed lookup if we have feedId
  if (feedId) {
    const apiKey = process.env.PODCAST_INDEX_API_KEY;
    const apiSecret = process.env.PODCAST_INDEX_API_SECRET;

    if (!apiKey || !apiSecret) {
      return null;
    }

    try {
      const apiTime = Math.floor(Date.now() / 1000);
      const hash = crypto.createHash('sha1')
        .update(apiKey + apiSecret + apiTime)
        .digest('hex');

      const url = `https://api.podcastindex.org/api/1.0/podcasts/byfeedid?id=${feedId}`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'BoostBot/1.0',
          'X-Auth-Date': apiTime.toString(),
          'X-Auth-Key': apiKey,
          'Authorization': hash
        }
      });

      if (response.ok) {
        const data = await response.json() as any;
        if (data.status === 'true' && data.feed) {
          // For music feeds, author is typically the artist
          return data.feed.author || data.feed.title || null;
        }
      }
    } catch (error) {
      logger.error('Error looking up artist from feed', { error, feedId });
    }
  }

  return null;
}