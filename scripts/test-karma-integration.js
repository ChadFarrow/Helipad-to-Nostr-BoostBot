#!/usr/bin/env node

import { karmaSystem } from '../dist/lib/karma-system.js';

// Mock webhook event for testing
const mockBoostEvent = {
  action: 2, // Boost
  value_msat_total: 1500000, // 1500 sats
  sender: 'TestUser',
  podcast: 'Test Podcast Show',
  episode: 'Episode 42: Testing Karma',
  message: 'Great episode!',
  time: Date.now()
};

console.log('🧪 Testing Karma Integration\n');

// Test the karma logic manually (simulating webhook processing)
console.log('📊 Before boost - Current karma stats:');
console.log(karmaSystem.getStats());
console.log('\n');

// Simulate the webhook karma tracking logic
const satsAmount = Math.floor(mockBoostEvent.value_msat_total / 1000);

if (mockBoostEvent.action === 2 && satsAmount > 0) {
  try {
    console.log(`💰 Processing boost: ${satsAmount} sats from ${mockBoostEvent.sender}`);
    
    // Track show karma
    const showName = mockBoostEvent.podcast || mockBoostEvent.episode || 'Unknown Show';
    karmaSystem.addKarma(showName, 'show', 1, satsAmount);
    
    // Track episode karma if different from show
    if (mockBoostEvent.episode && mockBoostEvent.episode !== mockBoostEvent.podcast) {
      const episodeName = mockBoostEvent.episode;
      karmaSystem.addKarma(episodeName, 'track', 1, satsAmount, {
        showName: showName,
        npub: mockBoostEvent.sender || ''
      });
    }
    
    // Track sender karma (person who sent the boost)
    if (mockBoostEvent.sender && mockBoostEvent.sender !== 'Unknown') {
      karmaSystem.addKarma(mockBoostEvent.sender, 'person', 1, satsAmount);
    }
    
    console.log(`✅ Karma tracked: Show "${showName}", Episode "${mockBoostEvent.episode || 'N/A'}", Sender "${mockBoostEvent.sender || 'Unknown'}" (+${satsAmount} sats)`);
  } catch (karmaError) {
    console.error('❌ Error tracking karma:', karmaError);
  }
}

console.log('\n📊 After boost - Updated karma stats:');
console.log(karmaSystem.getStats());

console.log('\n🏆 Show Leaderboard:');
console.log(karmaSystem.getLeaderboard('show'));

console.log('\n🎵 Track Leaderboard:');
console.log(karmaSystem.getLeaderboard('track'));

console.log('\n👥 People Leaderboard:');
console.log(karmaSystem.getLeaderboard('person'));

console.log('\n✅ Karma integration test completed!');