import { createNostrBot } from './lib/nostr-bot.ts';

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