#!/usr/bin/env node

import { karmaSystem } from '../lib/karma-system.js';

// Test data for daily summary
function addTestData() {
  console.log('📝 Adding test data for daily summary...\n');
  
  // Add some test karma
  karmaSystem.addKarma('John Doe', 'person', 3);
  karmaSystem.addKarma('Jane Smith', 'person', 2);
  karmaSystem.addKarma('The Folk Hour', 'show', 5);
  karmaSystem.addKarma('V4V Radio', 'show', 3);
  karmaSystem.addKarma('Episode 123', 'track', 4);
  karmaSystem.addKarma('A Musical Rebirth', 'track', 2);
  
  console.log('✅ Test data added!\n');
}

function generateDailySummary() {
  console.log('📊 **Daily Boost Summary**\n');
  console.log(`📅 Date: ${new Date().toLocaleDateString()}\n`);
  
  // Overall stats
  console.log(karmaSystem.getStats());
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Top people
  console.log(karmaSystem.getLeaderboard('person', 5));
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Top shows
  console.log(karmaSystem.getLeaderboard('show', 5));
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Top tracks
  console.log(karmaSystem.getLeaderboard('track', 5));
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Recent activity
  const entities = karmaSystem.getAllEntities();
  const recentEntities = entities
    .sort((a, b) => new Date(b.lastSeen) - new Date(a.lastSeen))
    .slice(0, 5);
  
  console.log('🕒 **Recent Activity**\n');
  recentEntities.forEach(entity => {
    const timeAgo = getTimeAgo(new Date(entity.lastSeen));
    console.log(`• ${entity.name} (${entity.type}) - ${entity.karma} karma - ${timeAgo}`);
  });
}

function getTimeAgo(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 60) {
    return `${diffMins} minutes ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hours ago`;
  } else {
    return `${diffDays} days ago`;
  }
}

// Main execution
console.log('🎵 BoostBot Daily Summary Test\n');

// Check if we should add test data
const args = process.argv.slice(2);
if (args.includes('--add-test-data')) {
  addTestData();
}

// Generate and display the summary
generateDailySummary();

console.log('\n✨ Daily summary test completed!'); 