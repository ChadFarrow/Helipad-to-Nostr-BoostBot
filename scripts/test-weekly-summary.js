#!/usr/bin/env node

import { karmaSystem } from '../lib/karma-system.js';

// Test data for weekly summary
function addTestData() {
  console.log('📝 Adding test data for weekly summary...\n');
  
  // Add more comprehensive test data
  karmaSystem.addKarma('John Doe', 'person', 8);
  karmaSystem.addKarma('Jane Smith', 'person', 5);
  karmaSystem.addKarma('Bob Wilson', 'person', 3);
  karmaSystem.addKarma('Alice Brown', 'person', 7);
  karmaSystem.addKarma('Charlie Davis', 'person', 2);
  
  karmaSystem.addKarma('The Folk Hour', 'show', 12);
  karmaSystem.addKarma('V4V Radio', 'show', 8);
  karmaSystem.addKarma('Jazz Night', 'show', 6);
  karmaSystem.addKarma('Classical Corner', 'show', 4);
  karmaSystem.addKarma('Rock Revolution', 'show', 9);
  
  karmaSystem.addKarma('Episode 123', 'track', 10);
  karmaSystem.addKarma('A Musical Rebirth', 'track', 7);
  karmaSystem.addKarma('Summer Vibes', 'track', 5);
  karmaSystem.addKarma('Winter Dreams', 'track', 3);
  karmaSystem.addKarma('Spring Awakening', 'track', 6);
  
  console.log('✅ Test data added!\n');
}

function generateWeeklySummary() {
  console.log('📊 **Weekly Boost Summary**\n');
  
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 7);
  
  console.log(`📅 Week of: ${weekStart.toLocaleDateString()} - ${now.toLocaleDateString()}\n`);
  
  // Overall stats
  console.log(karmaSystem.getStats());
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Top people of the week
  console.log(karmaSystem.getLeaderboard('person', 10));
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Top shows of the week
  console.log(karmaSystem.getLeaderboard('show', 10));
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Top tracks of the week
  console.log(karmaSystem.getLeaderboard('track', 10));
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Weekly highlights
  const entities = karmaSystem.getAllEntities();
  const topOverall = entities
    .sort((a, b) => b.karma - a.karma)
    .slice(0, 5);
  
  console.log('🌟 **Weekly Highlights**\n');
  topOverall.forEach((entity, index) => {
    const emoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '⭐';
    console.log(`${emoji} **${entity.name}** (${entity.type}) - ${entity.karma} karma`);
  });
  
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Activity breakdown
  const people = entities.filter(e => e.type === 'person');
  const shows = entities.filter(e => e.type === 'show');
  const tracks = entities.filter(e => e.type === 'track');
  
  console.log('📈 **Activity Breakdown**\n');
  console.log(`👥 **People:** ${people.length} unique boosters`);
  console.log(`📻 **Shows:** ${shows.length} shows boosted`);
  console.log(`🎵 **Tracks:** ${tracks.length} tracks boosted`);
  
  const totalBoosts = entities.reduce((sum, e) => sum + e.boostCount, 0);
  console.log(`💫 **Total Boosts:** ${totalBoosts} boosts this week`);
  
  // Most active time periods (simulated)
  console.log('\n🕒 **Peak Activity Times**');
  console.log('• Tuesday 8-10 PM: 15 boosts');
  console.log('• Thursday 7-9 PM: 12 boosts');
  console.log('• Saturday 2-4 PM: 8 boosts');
  
  console.log('\n' + '='.repeat(60) + '\n');
  
  // New discoveries
  const recentEntities = entities
    .sort((a, b) => new Date(b.firstSeen) - new Date(a.firstSeen))
    .slice(0, 3);
  
  if (recentEntities.length > 0) {
    console.log('🆕 **New Discoveries This Week**\n');
    recentEntities.forEach(entity => {
      const daysAgo = Math.floor((now - new Date(entity.firstSeen)) / (1000 * 60 * 60 * 24));
      console.log(`• ${entity.name} (${entity.type}) - ${daysAgo} days ago`);
    });
  }
}

function getTimeAgo(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else {
    return `${diffDays} days ago`;
  }
}

// Main execution
console.log('🎵 BoostBot Weekly Summary Test\n');

// Check if we should add test data
const args = process.argv.slice(2);
if (args.includes('--add-test-data')) {
  addTestData();
}

// Generate and display the summary
generateWeeklySummary();

console.log('\n✨ Weekly summary test completed!'); 