import dotenv from 'dotenv';
import { createNostrBot } from './lib/nostr-bot.ts';

// Load environment variables
dotenv.config();

try {
  const bot = createNostrBot();
  console.log('✅ Bot created successfully:', !!bot);
  
  if (bot) {
    console.log('✅ Nostr bot is working');
  } else {
    console.log('❌ Bot creation failed');
  }
} catch (error) {
  console.error('❌ Error creating bot:', error.message);
} 