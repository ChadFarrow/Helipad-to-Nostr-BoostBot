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
  
  // Get karma leaderboards
  const topShows = getTopKarma(3, 'show');
  const topTracks = getTopKarma(3, 'track');
  const topPeople = getTopKarma(3, 'person');
  
  const karmaLeaderboard = formatKarmaLeaderboard('Top Shows', topShows) +
                          formatKarmaLeaderboard('Top Tracks', topTracks) +
                          formatKarmaLeaderboard('Top People', topPeople);

  // Mock daily stats
  const dailyStats = {
    date: '2025-07-04',
    streamSats: 0,
    boostSats: 3500,
    streamShows: [],
    boostShows: ['The Sunday Morning Two Hour Folk Hour', 'V4V Radio']
  };

  const content = `📊 Daily V4V Summary - ${dailyStats.date}

🌊 Streamed: ${dailyStats.streamSats.toLocaleString()} sats
📤 Boosted: ${dailyStats.boostSats.toLocaleString()} sats
💰 Total: ${(dailyStats.streamSats + dailyStats.boostSats).toLocaleString()} sats

🚀 Boosted:
• The Sunday Morning Two Hour Folk Hour
• V4V Radio${karmaLeaderboard}

#V4V #Podcasting20 #PC20 #ValueStreaming #Boostagram #Karma`;

  console.log(content);
}

main().catch(console.error); 