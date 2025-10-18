#!/usr/bin/env node

// Debug script to see what the BlockClock sequence looks like
import BlockClockController from './lib/blockclock-integration.js';

const blockclock = new BlockClockController('192.168.0.182');

// Test data that matches what the webhook sends
const testBoostData = {
    amount: 2100,
    sender: 'TestUser',
    message: 'Test boost with BlockClock!',
    podcast: 'Test Podcast'
};

console.log('🔍 Debugging BlockClock sequence...\n');
console.log('Input data:');
console.log(JSON.stringify(testBoostData, null, 2));

console.log('\n📊 Smart Display Results:');
console.log(`Amount: ${testBoostData.amount}`);
console.log(`Sender: "${testBoostData.sender}" → "${blockclock.formatSenderName(testBoostData.sender)}"`);
console.log(`Message: "${testBoostData.message}" → "${blockclock.createSmartDisplay(testBoostData.message)}"`);
console.log(`Podcast: "${testBoostData.podcast}" → "${blockclock.formatPodcastName(testBoostData.podcast)}"`);

console.log('\n🎯 Amount-Only Mode (NEW):');
const bestDisplay = blockclock.chooseBestDisplay(testBoostData);
console.log(`Display choice: ${bestDisplay.type === 'number' ? 'NUMBER' : 'TEXT'}: "${bestDisplay.value}"`);
console.log(`Description: ${bestDisplay.description}`);

if (bestDisplay.type === 'number') {
    console.log(`\n📊 Your BlockClock will show: ${bestDisplay.value} (right-aligned)`);
} else {
    console.log(`\n📊 Your BlockClock will show: "${bestDisplay.value}"`);
}

console.log('\n⚡ Benefits of Amount-Only Mode:');
console.log('  ✅ Instant display (no waiting)');
console.log('  ✅ Clean, simple boost amounts');
console.log('  ✅ Right-aligned like a digital counter');
console.log('  ✅ Easy to read at a glance');

console.log('\n🔧 Previous Complex Mode (for reference):');
const sequence = blockclock.createDisplaySequence(testBoostData);
console.log(`  Would show ${sequence.length} items over ${Math.floor(sequence.reduce((sum, item, i) => sum + item.duration + (i > 0 ? 62000 : 0), 0) / 60000)} minutes`);