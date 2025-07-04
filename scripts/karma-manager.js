#!/usr/bin/env node

import { 
  loadKarmaData, 
  getKarmaStats, 
  getTopKarma, 
  getAllKarma, 
  exportKarmaData,
  addKarma 
} from '../lib/karma-system.ts';

// Command line argument parsing
const args = process.argv.slice(2);
const command = args[0];

async function main() {
  // Load karma data
  await loadKarmaData();
  
  switch (command) {
    case 'stats':
      await showStats();
      break;
    case 'top':
      const type = args[1] || 'all';
      const limit = parseInt(args[2]) || 10;
      await showTopKarma(type, limit);
      break;
    case 'list':
      const listType = args[1] || 'all';
      await listAllKarma(listType);
      break;
    case 'export':
      await exportKarma();
      break;
    case 'add':
      await addKarmaManually();
      break;
    case 'help':
    default:
      showHelp();
      break;
  }
}

async function showStats() {
  const stats = getKarmaStats();
  
  console.log('\n📊 KARMA STATISTICS');
  console.log('===================');
  console.log(`Total Entities: ${stats.totalEntities}`);
  console.log(`Total Karma: ${stats.totalKarma}`);
  console.log(`Total Boosts: ${stats.totalBoosts}`);
  console.log(`Total Sats: ${stats.totalSats.toLocaleString()}`);
  
  console.log('\n📈 BY TYPE:');
  console.log('People:');
  console.log(`  Count: ${stats.byType.person.count}`);
  console.log(`  Karma: ${stats.byType.person.karma}`);
  console.log(`  Boosts: ${stats.byType.person.boosts}`);
  console.log(`  Sats: ${stats.byType.person.sats.toLocaleString()}`);
  
  console.log('\nShows:');
  console.log(`  Count: ${stats.byType.show.count}`);
  console.log(`  Karma: ${stats.byType.show.karma}`);
  console.log(`  Boosts: ${stats.byType.show.boosts}`);
  console.log(`  Sats: ${stats.byType.show.sats.toLocaleString()}`);
  
  console.log('\nTracks:');
  console.log(`  Count: ${stats.byType.track.count}`);
  console.log(`  Karma: ${stats.byType.track.karma}`);
  console.log(`  Boosts: ${stats.byType.track.boosts}`);
  console.log(`  Sats: ${stats.byType.track.sats.toLocaleString()}`);
}

async function showTopKarma(type, limit) {
  let entities;
  let title;
  
  if (type === 'all') {
    entities = getTopKarma(limit);
    title = 'ALL ENTITIES';
  } else if (['person', 'show', 'track'].includes(type)) {
    entities = getTopKarma(limit, type);
    title = type.toUpperCase() + 'S';
  } else {
    console.log('❌ Invalid type. Use: person, show, track, or all');
    return;
  }
  
  console.log(`\n🏆 TOP ${limit} ${title} BY KARMA`);
  console.log('='.repeat(50));
  
  entities.forEach((entity, index) => {
    console.log(`${index + 1}. ${entity.name}`);
    console.log(`   Karma: ${entity.karma} | Boosts: ${entity.totalBoosts} | Sats: ${entity.totalSats.toLocaleString()}`);
    console.log(`   Type: ${entity.type} | Last seen: ${entity.lastSeen}`);
    if (entity.npub) {
      console.log(`   Npub: ${entity.npub}`);
    }
    if (entity.showName) {
      console.log(`   Show: ${entity.showName}`);
    }
    console.log('');
  });
}

async function listAllKarma(type) {
  let entities;
  let title;
  
  if (type === 'all') {
    entities = getAllKarma();
    title = 'ALL ENTITIES';
  } else if (['person', 'show', 'track'].includes(type)) {
    entities = getAllKarma(type);
    title = type.toUpperCase() + 'S';
  } else {
    console.log('❌ Invalid type. Use: person, show, track, or all');
    return;
  }
  
  console.log(`\n📋 ALL ${title} (${entities.length} total)`);
  console.log('='.repeat(50));
  
  entities
    .sort((a, b) => b.karma - a.karma)
    .forEach((entity, index) => {
      console.log(`${index + 1}. ${entity.name} (${entity.karma} karma)`);
    });
}

async function exportKarma() {
  const exportData = await exportKarmaData();
  const filename = `karma-export-${new Date().toISOString().split('T')[0]}.json`;
  
  try {
    const fs = await import('fs/promises');
    await fs.writeFile(filename, exportData);
    console.log(`✅ Karma data exported to ${filename}`);
  } catch (error) {
    console.error('❌ Failed to export karma data:', error.message);
  }
}

async function addKarmaManually() {
  const type = args[1];
  const name = args[2];
  const sats = parseInt(args[3]) || 0;
  const npub = args[4];
  const showName = args[5];
  
  if (!type || !name) {
    console.log('❌ Usage: node karma-manager.js add <type> <name> [sats] [npub] [showName]');
    console.log('   type: person, show, or track');
    console.log('   name: entity name');
    console.log('   sats: amount in sats (optional)');
    console.log('   npub: nostr pubkey for people (optional)');
    console.log('   showName: hosting show for tracks (optional)');
    return;
  }
  
  if (!['person', 'show', 'track'].includes(type)) {
    console.log('❌ Invalid type. Use: person, show, or track');
    return;
  }
  
  try {
    await addKarma(type, name, sats, npub, showName);
    console.log(`✅ Added karma for ${type} "${name}"`);
  } catch (error) {
    console.error('❌ Failed to add karma:', error.message);
  }
}

function showHelp() {
  console.log('\n🎯 KARMA MANAGER - Help');
  console.log('======================');
  console.log('');
  console.log('Commands:');
  console.log('  stats                    - Show karma statistics');
  console.log('  top [type] [limit]       - Show top karma entities');
  console.log('    type: person, show, track, or all (default: all)');
  console.log('    limit: number (default: 10)');
  console.log('');
  console.log('  list [type]              - List all entities');
  console.log('    type: person, show, track, or all (default: all)');
  console.log('');
  console.log('  export                    - Export karma data to JSON file');
  console.log('');
  console.log('  add <type> <name> [sats] [npub] [showName]');
  console.log('    - Manually add karma for an entity');
  console.log('');
  console.log('Examples:');
  console.log('  node karma-manager.js stats');
  console.log('  node karma-manager.js top person 5');
  console.log('  node karma-manager.js list show');
  console.log('  node karma-manager.js add person "John Doe" 1000 npub1abc...');
  console.log('  node karma-manager.js add track "Episode 123" 500 "" "Show Name"');
}

main().catch(console.error); 