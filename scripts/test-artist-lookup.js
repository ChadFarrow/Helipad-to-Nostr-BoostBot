#!/usr/bin/env node

import { lookupTrackInfoByGUID, lookupArtistName } from '../lib/podcast-index-lookup.js';
import 'dotenv/config';

console.log('🎵 Testing Podcast Index Artist Lookup\n');

// Check if API credentials are configured
if (!process.env.PODCAST_INDEX_API_KEY || !process.env.PODCAST_INDEX_API_SECRET) {
  console.error('❌ Error: PODCAST_INDEX_API_KEY and PODCAST_INDEX_API_SECRET must be set in .env file');
  console.log('\nTo get your free API credentials:');
  console.log('1. Visit https://api.podcastindex.org');
  console.log('2. Sign up for a free account');
  console.log('3. Add the credentials to your .env file\n');
  process.exit(1);
}

// Test cases - you can update these with real GUIDs from your webhook logs
const testCases = [
  {
    name: 'Test with feedId only',
    feedId: 6740245,  // Example: LNbeats feed
    podcastGuid: null,
    episodeGuid: null
  },
  {
    name: 'Test with episode GUID',
    feedId: 6740245,
    podcastGuid: '018c8cea-4153-5640-8da4-4678c2b87303',
    episodeGuid: 'f0f1c94e-8f2a-4d45-9e1f-3b5c7d8e9f0a'  // Replace with real GUID
  }
];

async function runTests() {
  for (const test of testCases) {
    console.log(`\n🔍 ${test.name}`);
    console.log('=' .repeat(50));
    
    try {
      // Test artist lookup
      const artist = await lookupArtistName(test.feedId, test.podcastGuid, test.episodeGuid);
      console.log(`Artist: ${artist || 'Not found'}`);
      
      // Test track info lookup if we have episode GUID
      if (test.episodeGuid) {
        const trackInfo = await lookupTrackInfoByGUID(
          test.episodeGuid,
          test.feedId,
          test.podcastGuid
        );
        
        if (trackInfo) {
          console.log('\nTrack Info:');
          console.log(`  Title: ${trackInfo.title || 'Not found'}`);
          console.log(`  Artist: ${trackInfo.artist || 'Not found'}`);
          console.log(`  Album: ${trackInfo.album || 'Not found'}`);
          console.log(`  Feed Title: ${trackInfo.feedTitle || 'Not found'}`);
        } else {
          console.log('Track info not found');
        }
      }
    } catch (error) {
      console.error('Error:', error.message);
    }
  }
}

// Run the tests
runTests().then(() => {
  console.log('\n✅ Test complete');
}).catch(error => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});