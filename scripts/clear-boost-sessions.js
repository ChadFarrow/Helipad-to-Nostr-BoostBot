#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { logger } from '../lib/logger.js';

const BOOST_SESSIONS_FILE = path.join(process.cwd(), 'boost-sessions.json');

function clearBoostSessions() {
  try {
    // Clear the file
    fs.writeFileSync(BOOST_SESSIONS_FILE, '[]', 'utf8');
    logger.info('✅ Boost sessions cleared from file');
    
    console.log('✅ Boost sessions cleared!');
    console.log('📝 File reset to: []');
    console.log('');
    console.log('💡 Now restart your webhook to clear in-memory sessions:');
    console.log('   node scripts/manage-webhooks.js restart sent');
    console.log('');
    console.log('🎯 You can now test boosts again without duplicate detection!');
    
  } catch (error) {
    logger.error('Failed to clear boost sessions', { error: error.message });
    console.error('❌ Failed to clear boost sessions:', error.message);
  }
}

clearBoostSessions(); 