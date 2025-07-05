// Simple test script for BoostBot Starter
import fetch from 'node-fetch';

const TEST_WEBHOOK_URL = 'http://localhost:3333/helipad-webhook';

const testEvent = {
  index: 123,
  time: Math.floor(Date.now() / 1000),
  value_msat: 1000000,
  value_msat_total: 1000000,
  action: 2, // Boost
  sender: "testuser",
  app: "helipad",
  message: "Test boost message",
  podcast: "Test Podcast",
  episode: "Test Episode",
  tlv: "test_tlv_data"
};

async function testWebhook() {
  console.log('🧪 Testing BoostBot Starter webhook...');
  console.log('📤 Sending test event:', JSON.stringify(testEvent, null, 2));
  
  try {
    const response = await fetch(TEST_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testEvent)
    });
    
    const result = await response.json();
    
    console.log('📥 Response status:', response.status);
    console.log('📥 Response body:', result);
    
    if (response.ok) {
      console.log('✅ Webhook test successful!');
    } else {
      console.log('❌ Webhook test failed');
    }
  } catch (error) {
    console.error('❌ Error testing webhook:', error.message);
  }
}

async function testHealth() {
  console.log('\n🏥 Testing health endpoint...');
  
  try {
    const response = await fetch('http://localhost:3333/health');
    const result = await response.json();
    
    console.log('📥 Health status:', response.status);
    console.log('📥 Health response:', result);
    
    if (response.ok) {
      console.log('✅ Health check successful!');
    } else {
      console.log('❌ Health check failed');
    }
  } catch (error) {
    console.error('❌ Error testing health:', error.message);
  }
}

// Run tests
async function runTests() {
  console.log('🚀 BoostBot Starter Test Suite\n');
  
  await testHealth();
  await testWebhook();
  
  console.log('\n✨ Test suite completed!');
}

runTests().catch(console.error); 