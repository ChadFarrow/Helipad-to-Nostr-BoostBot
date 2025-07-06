#!/usr/bin/env node

import { execSync, spawn } from 'child_process';
import { logger } from '../lib/logger.js';

const WEBHOOK_PORTS = {
  sent: 3333
};

function getProcessInfo() {
  try {
    const output = execSync('ps aux | grep -E "(helipad-webhook|tsx.*helipad)" | grep -v grep', { encoding: 'utf8' });
    return output.trim().split('\n').filter(line => line.trim());
  } catch (error) {
    return [];
  }
}

function checkHealth(port) {
  try {
    const response = execSync(`curl -s --max-time 5 http://localhost:${port}/health`, { encoding: 'utf8' });
    return { status: 'running', response: response.trim() };
  } catch (error) {
    return { status: 'not running', response: 'Connection failed' };
  }
}

function startWebhook(type) {
  const file = 'helipad-webhook.js';
  const port = WEBHOOK_PORTS[type];
  
  console.log(`Starting ${type} webhook server on port ${port}...`);
  
  const child = spawn('npx', ['tsx', file], {
    stdio: 'inherit',
    detached: true
  });
  
  child.unref();
  
  // Wait a moment and check if it started
  setTimeout(() => {
    const health = checkHealth(port);
    if (health.status === 'running') {
      console.log(`✅ ${type} webhook started successfully on port ${port}`);
    } else {
      console.log(`❌ Failed to start ${type} webhook on port ${port}`);
    }
  }, 2000);
}

function stopWebhook(type) {
  const port = WEBHOOK_PORTS[type];
  console.log(`Stopping ${type} webhook on port ${port}...`);
  
  try {
    execSync(`lsof -ti:${port} | xargs kill -9`, { stdio: 'ignore' });
    console.log(`✅ ${type} webhook stopped`);
  } catch (error) {
    console.log(`❌ No ${type} webhook running on port ${port}`);
  }
}

function showStatus() {
  console.log('\n=== Webhook Status ===');
  
  Object.entries(WEBHOOK_PORTS).forEach(([type, port]) => {
    const health = checkHealth(port);
    const status = health.status === 'running' ? '✅' : '❌';
    console.log(`${status} ${type.toUpperCase()} webhook (port ${port}): ${health.response}`);
  });
  
  const processes = getProcessInfo();
  if (processes.length > 0) {
    console.log('\n=== Running Processes ===');
    processes.forEach(process => {
      console.log(`📋 ${process}`);
    });
  }
  
  console.log('\n=== Available Commands ===');
  console.log('npm run start          - Start SENT webhook (port 3333)');
  console.log('npm run health         - Check health of webhook');
  console.log('node scripts/manage-webhooks.js start <type>  - Start specific webhook');
  console.log('node scripts/manage-webhooks.js stop <type>   - Stop specific webhook');
  console.log('node scripts/manage-webhooks.js status        - Show status');
}

function main() {
  const command = process.argv[2];
  const type = process.argv[3];
  
  switch (command) {
    case 'start':
      if (!type || !WEBHOOK_PORTS[type]) {
        console.log('Usage: node scripts/manage-webhooks.js start <sent>');
        process.exit(1);
      }
      startWebhook(type);
      break;
      
    case 'stop':
      if (!type || !WEBHOOK_PORTS[type]) {
        console.log('Usage: node scripts/manage-webhooks.js stop <sent>');
        process.exit(1);
      }
      stopWebhook(type);
      break;
      
    case 'restart':
      if (!type || !WEBHOOK_PORTS[type]) {
        console.log('Usage: node scripts/manage-webhooks.js restart <sent>');
        process.exit(1);
      }
      console.log(`Restarting ${type} webhook...`);
      stopWebhook(type);
      setTimeout(() => {
        startWebhook(type);
      }, 2000);
      break;
      
    case 'status':
    default:
      showStatus();
      break;
  }
}

main(); 