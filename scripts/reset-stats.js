#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

// Reset daily stats to today's date with 0 values
const resetDailyStats = () => {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  
  const dailyStats = {
    date: today,
    streamSats: 0,
    boostSats: 0,
    streamShows: [],
    boostShows: []
  };
  
  fs.writeFileSync('daily-stats.json', JSON.stringify(dailyStats, null, 2));
  console.log(`✅ Reset daily stats for ${today}`);
};

// Reset weekly stats to current week with 0 values
const resetWeeklyStats = () => {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Days to go back to Monday
  const monday = new Date(today);
  monday.setDate(today.getDate() - daysToMonday);
  
  const weekStart = monday.toISOString().split('T')[0];
  
  const weeklyStats = {
    weekStart: weekStart,
    streamSats: 0,
    boostSats: 0,
    streamShows: [],
    boostShows: [],
    dailyBreakdown: []
  };
  
  // Add daily breakdown for the current week
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    
    weeklyStats.dailyBreakdown.push({
      date: dateStr,
      streamSats: 0,
      boostSats: 0
    });
  }
  
  fs.writeFileSync('weekly-stats.json', JSON.stringify(weeklyStats, null, 2));
  console.log(`✅ Reset weekly stats for week starting ${weekStart}`);
};

// Main execution
console.log('🔄 Resetting V4V stats to fix split payment counting issue...\n');

try {
  resetDailyStats();
  resetWeeklyStats();
  
  console.log('\n✅ Stats reset complete!');
  console.log('📊 The bot will now correctly count each boost only once, regardless of split payments.');
  console.log('🚀 New payments will be tracked accurately going forward.');
  
} catch (error) {
  console.error('❌ Error resetting stats:', error.message);
  process.exit(1);
} 