#!/usr/bin/env node

import { loadKarmaData, getTopKarma } from '../lib/karma-system.ts';

// Helper function to format karma leaderboard (same as in nostr-bot.ts)
function formatKarmaLeaderboard(title, entities) {
  if (entities.length === 0) return '';
  
  let output = `\n🏆 ${title}\n`;
  entities.forEach((entity, idx) => {
    output += `${idx + 1}. ${entity.name} (${entity.karma} karma)`;
    if (entity.showName) output += ` - ${entity.showName}`;
    output += '\n';
  });
  return output;
}

async function main() {
  await loadKarmaData();
  
  // Get karma leaderboards for weekly summary (show more for weekly)
  const topShows = getTopKarma(5, 'show');
  const topTracks = getTopKarma(5, 'track');
  const topPeople = getTopKarma(5, 'person');
  
  const karmaLeaderboard = formatKarmaLeaderboard('Top Shows', topShows) +
                          formatKarmaLeaderboard('Top Tracks', topTracks) +
                          formatKarmaLeaderboard('Top People', topPeople);

  // Mock weekly stats
  const weeklyStats = {
    weekStart: '2025-07-01',
    streamSats: 0,
    boostSats: 14582,
    streamShows: [],
    boostShows: ['The Sunday Morning Two Hour Folk Hour', 'V4V Radio', 'Aged Friends & Old Whiskey'],
    dailyBreakdown: [
      { date: '2025-07-01', streamSats: 0, boostSats: 3834 },
      { date: '2025-07-02', streamSats: 0, boostSats: 3582 },
      { date: '2025-07-03', streamSats: 0, boostSats: 3470 },
      { date: '2025-07-04', streamSats: 0, boostSats: 3696 }
    ]
  };

  // Format date range
  const weekStart = new Date(weeklyStats.weekStart);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  
  const formatDate = (date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const dateRange = `${formatDate(weekStart)} - ${formatDate(weekEnd)}`;

  // Create daily breakdown text
  const dailyBreakdownText = weeklyStats.dailyBreakdown
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(day => {
      const dayName = new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' });
      const total = day.streamSats + day.boostSats;
      return `${dayName}: ${total.toLocaleString()} sats`;
    })
    .join(' | ');

  const content = `📊 Weekly V4V Summary - ${dateRange}

🌊 Streamed: ${weeklyStats.streamSats.toLocaleString()} sats
📤 Boosted: ${weeklyStats.boostSats.toLocaleString()} sats
💰 Total: ${(weeklyStats.streamSats + weeklyStats.boostSats).toLocaleString()} sats

📈 Daily breakdown: ${dailyBreakdownText}

🚀 Boosted:
• The Sunday Morning Two Hour Folk Hour
• V4V Radio
• Aged Friends & Old Whiskey${karmaLeaderboard}

#V4V #Podcasting20 #PC20 #ValueStreaming #WeeklySummary #Karma`;

  console.log(content);
}

main().catch(console.error); 