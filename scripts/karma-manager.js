#!/usr/bin/env node

import { karmaSystem } from '../dist/lib/karma-system.js';

const args = process.argv.slice(2);
const command = args[0];

function showHelp() {
  console.log(`
🎵 BoostBot Karma Manager

Usage: node scripts/karma-manager.js <command> [options]

Commands:
  stats                    Show karma system statistics
  leaderboard [type]       Show karma leaderboard (people/shows/tracks)
  add <name> <type> [amt]  Add karma to an entity
  get <name> <type>        Get karma for an entity
  list [type]              List all entities (people/shows/tracks)
  reset                    Reset all karma data
  help                     Show this help message

Types: person, show, track
Amount: Default is 1

Examples:
  node scripts/karma-manager.js stats
  node scripts/karma-manager.js leaderboard shows
  node scripts/karma-manager.js add "John Doe" person 5
  node scripts/karma-manager.js get "The Folk Hour" show
  node scripts/karma-manager.js list tracks
`);
}

function handleStats() {
  console.log(karmaSystem.getStats());
}

function handleLeaderboard() {
  const type = args[1];
  if (type && !['person', 'show', 'track'].includes(type)) {
    console.error('❌ Invalid type. Use: person, show, or track');
    return;
  }
  console.log(karmaSystem.getLeaderboard(type));
}

function handleAdd() {
  const name = args[1];
  const type = args[2];
  const amount = parseInt(args[3]) || 1;

  if (!name || !type) {
    console.error('❌ Missing name or type. Usage: add <name> <type> [amount]');
    return;
  }

  if (!['person', 'show', 'track'].includes(type)) {
    console.error('❌ Invalid type. Use: person, show, or track');
    return;
  }

  karmaSystem.addKarma(name, type, amount);
  console.log(`✅ Added ${amount} karma to ${type} "${name}"`);
}

function handleGet() {
  const name = args[1];
  const type = args[2];

  if (!name || !type) {
    console.error('❌ Missing name or type. Usage: get <name> <type>');
    return;
  }

  if (!['person', 'show', 'track'].includes(type)) {
    console.error('❌ Invalid type. Use: person, show, or track');
    return;
  }

  const karma = karmaSystem.getKarma(name, type);
  const entity = karmaSystem.getEntity(name, type);
  
  if (entity) {
    console.log(`📊 ${type.charAt(0).toUpperCase() + type.slice(1)}: "${name}"`);
    console.log(`   Karma: ${entity.karma}`);
    console.log(`   Boosts: ${entity.boostCount}`);
    console.log(`   First seen: ${new Date(entity.firstSeen).toLocaleString()}`);
    console.log(`   Last seen: ${new Date(entity.lastSeen).toLocaleString()}`);
  } else {
    console.log(`❌ No karma data found for ${type} "${name}"`);
  }
}

function handleList() {
  const type = args[1];
  const entities = type ? karmaSystem.getAllEntities().filter(e => e.type === type) : karmaSystem.getAllEntities();
  
  if (entities.length === 0) {
    console.log(`No ${type || 'entities'} found in karma system.`);
    return;
  }

  const typeLabel = type ? type.charAt(0).toUpperCase() + type.slice(1) + 's' : 'All Entities';
  console.log(`📋 ${typeLabel} (${entities.length}):\n`);
  
  entities
    .sort((a, b) => b.karma - a.karma)
    .forEach(entity => {
      console.log(`  ${entity.name} (${entity.type}) - ${entity.karma} karma (${entity.boostCount} boosts)`);
    });
}

function handleReset() {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('⚠️  Are you sure you want to reset ALL karma data? (yes/no): ', (answer) => {
    if (answer.toLowerCase() === 'yes') {
      karmaSystem.resetKarma();
      console.log('✅ Karma system reset successfully');
    } else {
      console.log('❌ Reset cancelled');
    }
    rl.close();
  });
}

// Main command handler
switch (command) {
  case 'stats':
    handleStats();
    break;
  case 'leaderboard':
    handleLeaderboard();
    break;
  case 'add':
    handleAdd();
    break;
  case 'get':
    handleGet();
    break;
  case 'list':
    handleList();
    break;
  case 'reset':
    handleReset();
    break;
  case 'help':
  case '--help':
  case '-h':
    showHelp();
    break;
  default:
    console.error('❌ Unknown command. Use "help" to see available commands.');
    showHelp();
    process.exit(1);
} 