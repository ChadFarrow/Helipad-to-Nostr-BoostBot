// Simple test script for BoostBot Starter
// This helps you verify that your bot is working correctly

// Load environment variables
require('dotenv').config();

// Use built-in fetch (Node.js 18+) or install node-fetch for older versions
const fetch = globalThis.fetch || require('node-fetch');

const TEST_WEBHOOK_URL = 'http://localhost:3333/helipad-webhook';

// Sample boost event (like what Helipad would send)
const testEvent = {
  index: 123,
  time: Math.floor(Date.now() / 1000),
  value_msat: 1000000,
  value_msat_total: 1000000,
  action: 2, // 2 = boost
  sender: "testuser",
  app: "helipad",
  message: "Test boost message",
  podcast: "Test Podcast",
  episode: "Test Episode",
  tlv: "test_tlv_data"
};

// Test the webhook endpoint
async function testWebhook() {
  console.log('🧪 Testing BoostBot Starter webhook...');
  console.log('📤 Sending test boost event:');
  console.log(JSON.stringify(testEvent, null, 2));
  
  try {
    const response = await fetch(TEST_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testEvent)
    });
    
    const result = await response.json();
    
    console.log('\n📥 Response:');
    console.log(`Status: ${response.status}`);
    console.log('Body:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('\n✅ Webhook test successful!');
    } else {
      console.log('\n❌ Webhook test failed');
    }
  } catch (error) {
    console.error('\n❌ Error testing webhook:', error.message);
    console.log('💡 Make sure BoostBot is running on port 3333');
  }
}

// Test the health endpoint
async function testHealth() {
  console.log('\n🏥 Testing health endpoint...');
  
  try {
    const response = await fetch('http://localhost:3333/health');
    const result = await response.json();
    
    console.log('📥 Health response:');
    console.log(`Status: ${response.status}`);
    console.log('Body:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('\n✅ Health check successful!');
    } else {
      console.log('\n❌ Health check failed');
    }
  } catch (error) {
    console.error('\n❌ Error testing health:', error.message);
    console.log('💡 Make sure BoostBot is running on port 3333');
  }
}

// Run all tests
async function runTests() {
  console.log('🚀 BoostBot Starter Test Suite\n');
  
  await testHealth();
  await testWebhook();
  
  console.log('\n✨ Test suite completed!');
  console.log('\n💡 If tests failed, make sure:');
  console.log('   1. BoostBot is running (npm start)');
  console.log('   2. Port 3333 is available');
  console.log('   3. Your .env file is configured');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
} 