#!/usr/bin/env node

import { musicShowBot } from '../lib/music-show-bot.js';
import { logger } from '../lib/logger.js';

async function testMusicShowBot() {
    console.log('🎵 Testing Music Show Bot...\n');

    // Test 1: Process a song start event
    console.log('📝 Test 1: Processing song start event...');
    await musicShowBot.processMusicShowEvent({
        timestamp: new Date().toISOString(),
        podcast: 'Music Show Example',
        episode: 'Episode #123',
        remote_podcast: 'Bloodshot Lies - The Album',
        remote_episode: 'My Brother',
        action: 1, // Stream
        value_sat: 10,
        sender: 'ChadF',
        message: 'Great song!',
        app: 'CurioCaster'
    });

    // Test 2: Process more activity for the same song
    console.log('📝 Test 2: Processing more activity for same song...');
    await musicShowBot.processMusicShowEvent({
        timestamp: new Date(Date.now() + 30000).toISOString(), // 30 seconds later
        podcast: 'UpBEATs',
        episode: 'Foam Finger #1',
        remote_podcast: 'Bloodshot Lies - The Album',
        remote_episode: 'My Brother',
        action: 2, // Boost
        value_sat: 50,
        sender: 'ChadF',
        message: 'Amazing track!',
        app: 'Castamatic'
    });

    // Test 3: Process a new song (should finish the previous one)
    console.log('📝 Test 3: Processing new song (should finish previous)...');
    await musicShowBot.processMusicShowEvent({
        timestamp: new Date(Date.now() + 60000).toISOString(), // 1 minute later
        podcast: 'Music Show Example',
        episode: 'Episode #123',
        remote_podcast: 'Take Me For A Drive',
        remote_episode: 'Take Me For A Drive',
        action: 1, // Stream
        value_sat: 15,
        sender: 'ChadF',
        message: 'New song starting!',
        app: 'Castamatic'
    });

    // Test 4: Check current song
    console.log('\n📊 Current song:');
    const currentSong = musicShowBot.getCurrentSong();
    if (currentSong) {
        console.log(`   Song: ${currentSong.song}`);
        console.log(`   Track: ${currentSong.track}`);
        console.log(`   Started: ${currentSong.startTime}`);
        console.log(`   Total sats: ${currentSong.totalSats}`);
        console.log(`   Boosts: ${currentSong.boostCount}`);
        console.log(`   Streams: ${currentSong.streamCount}`);
    } else {
        console.log('   No current song');
    }

    // Test 5: Check song history
    console.log('\n📜 Song history:');
    const recentSongs = musicShowBot.getRecentSongs(5);
    recentSongs.forEach((song, index) => {
        console.log(`   ${index + 1}. ${song.song} - ${song.track}`);
        console.log(`      Duration: ${song.startTime} to ${song.endTime || 'ongoing'}`);
        console.log(`      Stats: ${song.totalSats} sats, ${song.boostCount} boosts, ${song.streamCount} streams`);
    });

    // Test 6: Check show statistics
    console.log('\n📈 Show statistics:');
    const stats = musicShowBot.getShowStats();
    console.log(`   Total songs: ${stats.totalSongs}`);
    console.log(`   Total sats: ${stats.totalSats}`);
    console.log(`   Total boosts: ${stats.totalBoosts}`);
    console.log(`   Total streams: ${stats.totalStreams}`);
    console.log(`   Average sats per song: ${stats.averageSatsPerSong}`);

    console.log('\n✅ Music Show Bot test completed!');
}

// Run the test
testMusicShowBot().catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
}); 