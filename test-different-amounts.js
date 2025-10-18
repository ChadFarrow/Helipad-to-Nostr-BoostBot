#!/usr/bin/env node

// Test different boost amounts
import BlockClockController from './lib/blockclock-integration.js';

const blockclock = new BlockClockController('192.168.0.182');

const testAmounts = [21, 333, 2100, 100000, 5];

console.log('🧪 Testing different amounts...\n');

testAmounts.forEach(amount => {
    const testBoost = { amount, sender: 'Test', message: 'Test' };
    const display = blockclock.chooseBestDisplay(testBoost);
    console.log(`${amount} sats → ${display.type}: "${display.value}"`);
});

console.log('\n📤 Sending 21 sats to BlockClock...');
const testBoost = { amount: 21, sender: 'Test', message: 'Test' };
blockclock.announceBoost(testBoost).then(result => {
    console.log('Result:', result ? '✅ Success' : '❌ Failed');
}).catch(err => {
    console.error('Error:', err.message);
});