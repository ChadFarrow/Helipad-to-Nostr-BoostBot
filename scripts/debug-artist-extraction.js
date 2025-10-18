#!/usr/bin/env node

// Test script to debug artist extraction logic
console.log('🎵 Testing artist extraction logic...\n');

// Test cases that might be coming from Helipad webhooks
const testCases = [
  // Email format
  { name: 'thetrustedband@fountain.fm', expected: 'The Trusted Band' },
  { name: 'artistname@wavlake.com', expected: 'Artistname' },
  
  // Via format
  { name: 'This That via Wavlake', expected: 'This That' },
  { name: 'Artist Name via fountain', expected: 'Artist Name' },
  
  // Camel case usernames
  { name: 'ThisThat', expected: 'This That' },
  { name: 'theArtistName', expected: 'The Artist Name' },
  
  // Simple names
  { name: 'This That', expected: 'This That' },
  { name: 'artist', expected: 'Artist' },
  
  // Edge cases
  { name: 'PodcastGuru', expected: 'Podcast Guru' },
  { name: null, expected: 'Unknown Artist' },
  { name: undefined, expected: 'Unknown Artist' }
];

// Replicate the extraction logic from helipad-webhook.ts
function extractArtist(eventName) {
  let artist;
  
  if (eventName && typeof eventName === 'string') {
    // Check if name looks like an email/identifier
    if (eventName.includes('@')) {
      // Extract artist from email format
      const username = eventName.split('@')[0];
      artist = username
        .replace(/([A-Z])/g, ' $1')  // Add spaces before capitals
        .replace(/[_-]/g, ' ')  // Replace underscores and hyphens with spaces
        .trim()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    } else if (!eventName.includes('via')) {
      // If it's not an email and doesn't have "via", check if it looks like a username
      if (/^[a-zA-Z][a-zA-Z0-9]*$/.test(eventName)) {
        // Convert username to readable format
        if (/[A-Z]/.test(eventName)) {
          // Has capitals - convert camelCase/PascalCase
          artist = eventName
            .replace(/([A-Z])/g, ' $1')
            .trim()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
        } else {
          // All lowercase - just capitalize first letter
          artist = eventName.charAt(0).toUpperCase() + eventName.slice(1).toLowerCase();
        }
      } else {
        // Use as-is for complex names
        artist = eventName;
      }
    } else {
      // Has "via" - extract the part before it
      artist = eventName.split(' via ')[0].trim();
    }
  }
  
  return artist || 'Unknown Artist';
}

// Run tests
console.log('Test Results:');
console.log('=============\n');

testCases.forEach((testCase, index) => {
  const result = extractArtist(testCase.name);
  const passed = result === testCase.expected;
  
  console.log(`Test ${index + 1}: ${passed ? '✅' : '❌'}`);
  console.log(`  Input: "${testCase.name}"`);
  console.log(`  Expected: "${testCase.expected}"`);
  console.log(`  Got: "${result}"`);
  console.log('');
});

// Additional debug for the specific case mentioned
console.log('\n🔍 Debugging "This That" case:');
console.log('================================\n');

const debugCases = [
  'This That',
  'thisThat',
  'ThisThat',
  'this-that',
  'this_that',
  'thisthat@fountain.fm',
  'This That via Wavlake'
];

debugCases.forEach(name => {
  console.log(`Input: "${name}" → Artist: "${extractArtist(name)}"`);
});