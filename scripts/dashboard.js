#!/usr/bin/env node

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';

function getProcessInfo() {
  try {
    const output = execSync('ps aux | grep -E "(helipad-webhook|tsx.*helipad)" | grep -v grep', { encoding: 'utf8' });
    return output.trim().split('\n').filter(line => line.trim());
  } catch (error) {
    return [];
  }
}

function getHealthStatus() {
  try {
    const response = execSync('curl -s -w "%{http_code}" http://localhost:3333/health', { encoding: 'utf8' });
    const statusCode = response.slice(-3);
    const body = response.slice(0, -3);
    return { statusCode: parseInt(statusCode), body: body.trim() };
  } catch (error) {
    return { statusCode: 0, body: 'Connection failed' };
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

function getSystemInfo() {
  try {
    const uptime = execSync('uptime', { encoding: 'utf8' }).trim();
    const memory = execSync('top -l 1 -s 0 | grep PhysMem', { encoding: 'utf8' }).trim();
    return { uptime, memory };
  } catch (error) {
    return { uptime: 'Unknown', memory: 'Unknown' };
  }
}

function getStatusFile() {
  if (existsSync('bot-status.json')) {
    try {
      return JSON.parse(readFileSync('bot-status.json', 'utf8'));
    } catch (error) {
      return null;
    }
  }
  return null;
}

function formatUptime(timeStr) {
  if (!timeStr || timeStr === 'Unknown') return 'Unknown';
  
  // Extract time from uptime command output
  const match = timeStr.match(/up\s+(.+?),\s+\d+ users/);
  if (match) {
    return match[1];
  }
  return timeStr;
}

function main() {
  console.clear();
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                    🤖 BoostBot Dashboard                    ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`📅 ${new Date().toLocaleString()}\n`);
  
  // Get all status information
  const processes = getProcessInfo();
  const health = getHealthStatus();
  const portInfo = getPortStatus();
  const systemInfo = getSystemInfo();
  const statusFile = getStatusFile();
  
  // Overall Status
  const isRunning = processes.length > 0 && health.statusCode === 200;
  console.log(`🔍 Overall Status: ${isRunning ? '✅ RUNNING' : '❌ STOPPED'}`);
  console.log(`📊 Process Count: ${processes.length}`);
  console.log(`🏥 Health Check: ${health.statusCode === 200 ? '✅ OK' : '❌ FAILED'}`);
  console.log(`🔌 Port 3333: ${portInfo.length > 0 ? '✅ IN USE' : '❌ NOT IN USE'}`);
  console.log('');
  
  // Process Details
  if (processes.length > 0) {
    console.log('📋 Process Details:');
    processes.forEach((process, index) => {
      const parts = process.split(/\s+/);
      const pid = parts[1];
      const cpu = parts[2];
      const mem = parts[3];
      const time = parts[8];
      
      console.log(`  ${index + 1}. PID: ${pid} | CPU: ${cpu}% | Memory: ${mem}% | Time: ${time}`);
    });
    console.log('');
  }
  
  // Health Details
  console.log('🏥 Health Details:');
  console.log(`  Status Code: ${health.statusCode}`);
  console.log(`  Response: ${health.body}`);
  console.log('');
  
  // Network Information
  console.log('🌐 Network Information:');
  console.log('  📡 Webhook URL: http://localhost:3333/helipad-webhook');
  console.log('  💚 Health Check: http://localhost:3333/health');
  console.log('  🧪 Test Daily Summary: http://localhost:3333/test-daily-summary');
  console.log('  📊 Test Weekly Summary: http://localhost:3333/test-weekly-summary');
  console.log('');
  
  // System Information
  console.log('💻 System Information:');
  console.log(`  🕐 System Uptime: ${formatUptime(systemInfo.uptime)}`);
  console.log(`  💾 Memory: ${systemInfo.memory}`);
  console.log('');
  
  // Last Status Check
  if (statusFile) {
    console.log('📈 Last Status Check:');
    console.log(`  📅 Time: ${new Date(statusFile.timestamp).toLocaleString()}`);
    console.log(`  🔄 Status: ${statusFile.isRunning ? 'Running' : 'Stopped'}`);
    if (statusFile.uptime) {
      console.log(`  ⏱️  Bot Uptime: ${statusFile.uptime}`);
    }
    console.log('');
  }
  
  // Quick Actions
  console.log('⚡ Quick Actions:');
  console.log('  npm run status     - Detailed status check');
  console.log('  npm run restart    - Restart the bot');
  console.log('  npm run stop       - Stop the bot');
  console.log('  npm run logs       - View logs');
  console.log('  npm run monitor    - One-time status check');
  console.log('  npm run watch      - Continuous monitoring');
  console.log('  npm run auto-restart - Auto-restart on failure');
  console.log('');
  
  // Status Indicators
  console.log('📊 Status Indicators:');
  console.log(`  🟢 Running: ${isRunning ? 'Yes' : 'No'}`);
  console.log(`  🟡 Processes: ${processes.length > 0 ? 'Yes' : 'No'}`);
  console.log(`  🟢 Health: ${health.statusCode === 200 ? 'Yes' : 'No'}`);
  console.log(`  🟢 Port: ${portInfo.length > 0 ? 'Yes' : 'No'}`);
  console.log('');
  
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                    End of Dashboard                         ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
}

main(); 