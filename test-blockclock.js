#!/usr/bin/env node

// Test script for BlockClock Mini integration
import BlockClockController from './lib/blockclock-integration.js';

async function main() {
    const args = process.argv.slice(2);
    const blockclock = new BlockClockController('192.168.0.182');
    
    if (args.length === 0) {
        console.log('BlockClock Mini Test Commands:');
        console.log('  node test-blockclock.js test      - Test connection and capabilities');
        console.log('  node test-blockclock.js message "Hello"  - Send a short message');
        console.log('  node test-blockclock.js long-message "This is a longer message"  - Test smart display');
        console.log('  node test-blockclock.js boost     - Test boost notification sequence');
        console.log('  node test-blockclock.js status    - Check status');
        return;
    }
    
    try {
        switch (args[0]) {
            case 'test':
                console.log('🧪 Running comprehensive BlockClock test...');
                const testResult = await blockclock.testConnection();
                console.log('\n📊 Test Results:');
                console.log(`Connectivity: ${testResult.connectivity ? '✅' : '❌'}`);
                console.log(`Status API: ${testResult.status ? '✅' : '❌'}`);
                console.log(`Messaging: ${testResult.messaging ? '✅' : '❌'}`);
                break;
                
            case 'message':
                if (args[1]) {
                    const message = args.slice(1).join(' ');
                    console.log(`📤 Sending message: "${message}"`);
                    const result = await blockclock.sendMessage(message);
                    console.log('Result:', result.success ? '✅ Success' : '❌ Failed');
                } else {
                    console.log('❌ Please provide a message');
                }
                break;
                
            case 'long-message':
                if (args[1]) {
                    const longMessage = args.slice(1).join(' ');
                    console.log(`📤 Testing long message display: "${longMessage}"`);
                    
                    // Test smart display
                    const smartDisplay = blockclock.createSmartDisplay(longMessage);
                    console.log(`🧠 Smart display result: "${smartDisplay}"`);
                    
                    // Test actual sending
                    const result = await blockclock.sendMessage(smartDisplay);
                    console.log('Result:', result.success ? '✅ Success' : '❌ Failed');
                } else {
                    console.log('❌ Please provide a long message');
                }
                break;
                
            case 'boost':
                console.log('🚀 Testing boost notification...');
                const boostData = {
                    amount: 2100,
                    message: 'This is an awesome boost message!',
                    sender: 'SuperBooster',
                    podcast: 'Amazing Podcast Show'
                };
                const boostResult = await blockclock.announceBoost(boostData);
                console.log('Boost notification:', boostResult ? '✅ Success' : '❌ Failed');
                break;
                
            case 'status':
                console.log('📊 Checking BlockClock status...');
                const statusResult = await blockclock.getStatus();
                if (statusResult.success) {
                    console.log('✅ Status received:', statusResult.data);
                } else {
                    console.log('❌ Status check failed:', statusResult.error);
                }
                break;
                
            default:
                console.log('❌ Unknown command. Use "test", "message", "boost", or "status"');
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

main();