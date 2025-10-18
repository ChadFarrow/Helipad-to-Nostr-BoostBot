#!/usr/bin/env node

// Test 333 boost amount specifically
import BlockClockController from './lib/blockclock-integration.js';

const blockclock = new BlockClockController('192.168.0.182');

// Test boost with 333 sats
const testBoost = {
    amount: 333,
    sender: 'TestUser',
    message: 'Test 333',
    action: 2
};

console.log('🧪 Testing 333 sats boost...');

// Test the right alignment function
const rightAligned = blockclock.rightAlignText('333');
console.log(`Right-aligned 333: "${rightAligned}" (length: ${rightAligned.length})`);

// Test the best display choice
const bestDisplay = blockclock.chooseBestDisplay(testBoost);
console.log(`Best display: "${bestDisplay.value}"`);
console.log(`Type: ${bestDisplay.type}`);

// Send to BlockClock
console.log('\n📤 Sending to BlockClock...');
blockclock.announceBoost(testBoost).then(result => {
    console.log('Result:', result ? '✅ Success' : '❌ Failed');
}).catch(err => {
    console.error('Error:', err.message);
});