import fs from 'fs';
import path from 'path';
import readline from 'readline';

const WEEKLY_STATS_FILE = 'weekly-stats.json';
const DAILY_STATS_FILE = 'daily-stats.json';
const SENT_CSV = 'sent_this_week.csv';

// Helper to get date (YYYY-MM-DD) from ISO string
function getDate(iso) {
  return iso.split('T')[0];
}

// Helper to get week start (Monday) for a date
function getWeekStart(dateStr) {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split('T')[0];
}

async function main() {
  const sessions = new Map(); // sessionId -> {date, sats, show}
  const dailyTotals = {};
  let weekStart = null;

  const rl = readline.createInterface({
    input: fs.createReadStream(SENT_CSV),
    crlfDelay: Infinity
  });

  let header = [];
  for await (const line of rl) {
    if (!header.length) {
      header = line.split(',');
      continue;
    }
    const cols = line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/);
    const [,, time, , , value_msat_total, value_sat_total, , sender, , message, podcast, episode] = cols;
    const date = getDate(time.replace(/"/g, ''));
    if (!weekStart) weekStart = getWeekStart(date);
    // Unique session: sender+podcast+episode+message+date
    const sessionId = [sender, podcast, episode, message, date].map(s => (s || '').replace(/"/g, '').trim()).join('|');
    const sats = parseInt(value_sat_total.replace(/"/g, ''));
    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, { date, sats, show: podcast.replace(/"/g, '').trim() });
      dailyTotals[date] = (dailyTotals[date] || 0) + sats;
    }
  }

  // Build weekly stats
  const weekDates = [];
  const monday = new Date(weekStart);
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    weekDates.push(d.toISOString().split('T')[0]);
  }

  const boostShows = Array.from(new Set(Array.from(sessions.values()).map(s => s.show)));
  const boostSats = Array.from(sessions.values()).reduce((sum, s) => sum + s.sats, 0);

  // Update weekly-stats.json
  const weeklyStats = {
    weekStart,
    streamSats: 0,
    boostSats,
    streamShows: [],
    boostShows,
    dailyBreakdown: weekDates.map(date => ({
      date,
      streamSats: 0,
      boostSats: dailyTotals[date] || 0
    }))
  };
  fs.writeFileSync(WEEKLY_STATS_FILE, JSON.stringify(weeklyStats, null, 2));
  console.log('✅ Updated weekly-stats.json');

  // Update daily-stats.json for today
  const today = new Date().toISOString().split('T')[0];
  const todayStats = {
    date: today,
    streamSats: 0,
    boostSats: dailyTotals[today] || 0,
    streamShows: [],
    boostShows: Array.from(new Set(Array.from(sessions.values()).filter(s => s.date === today).map(s => s.show)))
  };
  fs.writeFileSync(DAILY_STATS_FILE, JSON.stringify(todayStats, null, 2));
  console.log('✅ Updated daily-stats.json');
}

main().catch(e => { console.error(e); process.exit(1); }); 