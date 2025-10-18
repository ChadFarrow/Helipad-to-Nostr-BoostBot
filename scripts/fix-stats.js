#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🔧 Fixing BoostBot Statistics\n');

// Load current stats
const dailyStatsPath = path.join(__dirname, '../daily-stats.json');
const weeklyStatsPath = path.join(__dirname, '../weekly-stats.json');

const dailyStats = JSON.parse(fs.readFileSync(dailyStatsPath, 'utf8'));
const weeklyStats = JSON.parse(fs.readFileSync(weeklyStatsPath, 'utf8'));

console.log('Current stats:');
console.log('Daily:', dailyStats);
console.log('Weekly totals:', weeklyStats.streamSats + weeklyStats.boostSats);

// Fix approach: Recalculate weekly totals from daily breakdown
// This assumes the daily breakdowns are more accurate (less likely to have duplicates)
const recalculated = {
  streamSats: 0,
  boostSats: 0
};

weeklyStats.dailyBreakdown.forEach(day => {
  recalculated.streamSats += day.streamSats;
  recalculated.boostSats += day.boostSats;
});

console.log('\nRecalculated weekly totals from daily breakdown:');
console.log('- Stream:', recalculated.streamSats);
console.log('- Boost:', recalculated.boostSats);
console.log('- Total:', recalculated.streamSats + recalculated.boostSats);

// Update weekly stats with recalculated values
weeklyStats.streamSats = recalculated.streamSats;
weeklyStats.boostSats = recalculated.boostSats;

// Also add today's stats to the weekly breakdown if not already there
const todayIndex = weeklyStats.dailyBreakdown.findIndex(d => d.date === dailyStats.date);
if (todayIndex >= 0) {
  // Update existing entry
  weeklyStats.dailyBreakdown[todayIndex] = {
    date: dailyStats.date,
    streamSats: dailyStats.streamSats,
    boostSats: dailyStats.boostSats
  };
} else {
  // Add new entry
  weeklyStats.dailyBreakdown.push({
    date: dailyStats.date,
    streamSats: dailyStats.streamSats,
    boostSats: dailyStats.boostSats
  });
}

// Recalculate again with today included
const finalTotals = {
  streamSats: 0,
  boostSats: 0
};

weeklyStats.dailyBreakdown.forEach(day => {
  finalTotals.streamSats += day.streamSats;
  finalTotals.boostSats += day.boostSats;
});

weeklyStats.streamSats = finalTotals.streamSats;
weeklyStats.boostSats = finalTotals.boostSats;

console.log('\nFinal weekly totals (including today):');
console.log('- Stream:', finalTotals.streamSats);
console.log('- Boost:', finalTotals.boostSats);
console.log('- Total:', finalTotals.streamSats + finalTotals.boostSats);

// Write updated stats
const response = process.argv[2];
if (response === '--apply') {
  fs.writeFileSync(weeklyStatsPath, JSON.stringify(weeklyStats, null, 2));
  console.log('\n✅ Stats have been fixed and saved!');
} else {
  console.log('\n⚠️  This is a dry run. To apply changes, run:');
  console.log('   node scripts/fix-stats.js --apply');
}