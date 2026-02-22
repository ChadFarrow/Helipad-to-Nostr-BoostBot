#!/usr/bin/env node

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getProcessInfo() {
  try {
    const output = execSync('ps aux | grep -E "(helipad-webhook|tsx.*helipad)" | grep -v grep', { encoding: 'utf8' });
    return output.trim().split('\n').filter(line => line.trim());
  } catch (error) {
    return [];
  }
}

function getHealthStatus() {
  const serverIP = process.env.SERVER_IP || '192.168.0.243';
  try {
    const response = execSync(`curl -s http://${serverIP}:3333/health`, { encoding: 'utf8', timeout: 5000 });
    return { statusCode: 200, body: response.trim() };
  } catch (error) {
    return { statusCode: 0, body: 'Connection failed or timed out' };
  }
}

function getPortStatus() {
  try {
    const output = execSync('lsof -i :3333', { encoding: 'utf8' });
    return output.trim().split('\n').slice(1); // Skip header
  } catch (error) {
    return [];
  }
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function main() {
  console.log('🤖 BoostBot Status Check\n');
  
  // Check if processes are running
  const processes = getProcessInfo();
  
  if (processes.length === 0) {
    console.log('❌ BoostBot is NOT running');
    console.log('\nTo start the bot: npm start');
    return;
  }
  
  console.log('✅ BoostBot is running');
  console.log(`📊 Found ${processes.length} related process(es)\n`);
  
  // Show process details
  processes.forEach((process, index) => {
    const parts = process.split(/\s+/);
    const pid = parts[1];
    const cpu = parts[2];
    const mem = parts[3];
    const time = parts[8];
    const command = parts.slice(10).join(' ');
    
    console.log(`Process ${index + 1}:`);
    console.log(`  PID: ${pid}`);
    console.log(`  CPU: ${cpu}%`);
    console.log(`  Memory: ${mem}%`);
    console.log(`  Time: ${time}`);
    console.log(`  Command: ${command.substring(0, 80)}...`);
    console.log('');
  });
  
  // Check health endpoint
  console.log('🏥 Health Check:');
  const health = getHealthStatus();
  if (health.statusCode === 200) {
    console.log('  ✅ Health endpoint responding');
    console.log(`  📝 Response: ${health.body}`);
  } else {
    console.log('  ❌ Health endpoint not responding');
    console.log(`  📝 Status: ${health.statusCode}`);
  }
  console.log('');
  
  // Check port usage
  console.log('🔌 Port Status (3333):');
  const portInfo = getPortStatus();
  if (portInfo.length > 0) {
    console.log('  ✅ Port 3333 is in use');
    portInfo.forEach(info => {
      const parts = info.split(/\s+/);
      console.log(`  📡 Process: ${parts[0]} (PID: ${parts[1]})`);
    });
  } else {
    console.log('  ❌ Port 3333 is not in use');
  }
  console.log('');
  
  // Show webhook URL
  const serverIP = process.env.SERVER_IP || '192.168.0.243';
  console.log('🌐 Webhook Information:');
  console.log(`  📡 Webhook URL: http://${serverIP}:3333/helipad-webhook`);
  console.log(`  💚 Health Check: http://${serverIP}:3333/health`);
  console.log('');
  
  console.log('💡 Management Commands:');
  console.log('  npm run status    - Check this status again');
  console.log('  npm run stop      - Stop the bot');
  console.log('  npm run restart   - Restart the bot');
  console.log('  npm run logs      - View recent logs');
  console.log('  npm run health    - Quick health check');
}

main(); 