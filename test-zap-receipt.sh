#!/bin/bash

# Test script for zap receipt implementation
# This sends a mock Helipad webhook event to test the zap receipt tags

echo "🧪 Testing Zap Receipt Implementation"
echo "====================================="
echo ""

# Check if bot is running
if ! curl -s http://localhost:3333/health > /dev/null 2>&1; then
    echo "❌ Bot is not running. Start it first with: npm run dev"
    exit 1
fi

echo "✅ Bot is running"
echo ""

# Mock Helipad payment event with all fields needed for zap receipt
MOCK_EVENT='{
  "index": 12345,
  "time": '$(date +%s)',
  "value_msat": 10000000,
  "value_msat_total": 10000000,
  "action": 2,
  "sender": "ChadF",
  "app": "Fountain",
  "message": "Testing zap receipts! 🚀",
  "podcast": "Test Podcast Show",
  "episode": "Episode 42: Testing Zaps",
  "tlv": "",
  "payment_info": {
    "payment_hash": "test_hash_123456789abcdef",
    "pubkey": "82341f882b6eabcd2ba7f1ef90aad961cf074af15b9ef44a09f9d2a8fbfbe6a2",
    "custom_key": 7629169,
    "custom_value": "test_value",
    "fee_msat": 1000,
    "reply_to_idx": null
  }
}'

echo "📤 Sending mock boost event..."
echo ""
echo "Event details:"
echo "  Amount: 10,000 sats"
echo "  Sender: ChadF"
echo "  Message: Testing zap receipts! 🚀"
echo "  Podcast: Test Podcast Show"
echo ""

RESPONSE=$(curl -s -X POST http://localhost:3333/helipad-webhook \
  -H "Content-Type: application/json" \
  -d "$MOCK_EVENT")

echo "📨 Response: $RESPONSE"
echo ""
echo "✅ Test event sent!"
echo ""
echo "📋 Next steps:"
echo "  1. Check the bot logs to see the event processing"
echo "  2. Look for log message: 'Tags being added to boost post (kind 1 with zap receipt tags)'"
echo "  3. Verify zapTagsCount is showing (should be ~6 tags)"
echo "  4. If TEST_MODE=true, you'll see the full event in logs without posting to Nostr"
echo "  5. If TEST_MODE=false, check your Nostr client for the new post with embedded zap tags"
echo ""
echo "To view logs in real-time:"
echo "  npm run logs"
echo ""
