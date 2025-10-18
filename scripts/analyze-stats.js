#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('📊 Analyzing BoostBot Statistics\n');

// Load current stats
const dailyStats = JSON.parse(fs.readFileSync(path.join(__dirname, '../daily-stats.json'), 'utf8'));
const weeklyStats = JSON.parse(fs.readFileSync(path.join(__dirname, '../weekly-stats.json'), 'utf8'));

console.log('Daily Stats:', dailyStats.date);
console.log('- Stream Sats:', dailyStats.streamSats.toLocaleString());
console.log('- Boost Sats:', dailyStats.boostSats.toLocaleString());
console.log('- Total:', (dailyStats.streamSats + dailyStats.boostSats).toLocaleString());
console.log('- Stream Shows:', dailyStats.streamShows);
console.log('- Boost Shows:', dailyStats.boostShows);

console.log('\nWeekly Stats (Week of', weeklyStats.weekStart + '):');
console.log('- Stream Sats:', weeklyStats.streamSats.toLocaleString());
console.log('- Boost Sats:', weeklyStats.boostSats.toLocaleString());
console.log('- Total:', (weeklyStats.streamSats + weeklyStats.boostSats).toLocaleString());

console.log('\nDaily Breakdown:');
weeklyStats.dailyBreakdown.forEach(day => {
  const total = day.streamSats + day.boostSats;
  console.log(`  ${day.date}: ${total.toLocaleString()} sats (stream: ${day.streamSats.toLocaleString()}, boost: ${day.boostSats.toLocaleString()})`);
});

// Calculate daily average
const totalDays = weeklyStats.dailyBreakdown.length;
const avgDaily = Math.round((weeklyStats.streamSats + weeklyStats.boostSats) / totalDays);
console.log(`\nAverage per day: ${avgDaily.toLocaleString()} sats`);

// Look for potential issues
console.log('\n⚠️  Potential Issues:');

// Check if daily total matches weekly for today
const todayInWeekly = weeklyStats.dailyBreakdown.find(d => d.date === dailyStats.date);
if (todayInWeekly) {
  if (todayInWeekly.streamSats !== dailyStats.streamSats || todayInWeekly.boostSats !== dailyStats.boostSats) {
    console.log('❌ Daily stats mismatch with weekly breakdown for today');
    console.log(`   Daily: ${dailyStats.streamSats + dailyStats.boostSats}`);
    console.log(`   Weekly: ${todayInWeekly.streamSats + todayInWeekly.boostSats}`);
  }
}

// Check for unusually high single-day amounts
weeklyStats.dailyBreakdown.forEach(day => {
  const total = day.streamSats + day.boostSats;
  if (total > 50000) {
    console.log(`⚠️  High daily total on ${day.date}: ${total.toLocaleString()} sats`);
  }
});

// Check weekly total vs sum of daily
const calculatedWeeklyStream = weeklyStats.dailyBreakdown.reduce((sum, day) => sum + day.streamSats, 0);
const calculatedWeeklyBoost = weeklyStats.dailyBreakdown.reduce((sum, day) => sum + day.boostSats, 0);

if (calculatedWeeklyStream !== weeklyStats.streamSats || calculatedWeeklyBoost !== weeklyStats.boostSats) {
  console.log('❌ Weekly totals do not match sum of daily breakdowns');
  console.log(`   Weekly shows: ${weeklyStats.streamSats + weeklyStats.boostSats}`);
  console.log(`   Sum of days: ${calculatedWeeklyStream + calculatedWeeklyBoost}`);
}

console.log('\n💡 Notes:');
console.log('- The bot tracks ALL webhook events including split payments');
console.log('- A single boost might generate multiple webhook events (splits)');
console.log('- Stats might be inflated if counting split payments separately');
console.log('- Check if value_msat_total is being used correctly');