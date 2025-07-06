#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

function checkIfProcessRunning(processName) {
  try {
    const result = execSync(`pgrep -f "${processName}"`, { encoding: 'utf8' });
    return result.trim().split('\n').filter(pid => pid.trim());
  } catch (error) {
    return [];
  }
}

function getProcessInfo(pids) {
  const processes = [];
  
  for (const pid of pids) {
    try {
      const psResult = execSync(`ps -p ${pid} -o pid,pcpu,pmem,etime,command --no-headers`, { encoding: 'utf8' });
      const parts = psResult.trim().split(/\s+/);
      
      if (parts.length >= 5) {
        processes.push({
          pid: parts[0],
          cpu: parts[1],
          memory: parts[2],
          time: parts[3],
          command: parts.slice(4).join(' ')
        });
      }
    } catch (error) {
      // Process might have ended
    }
  }
  
  return processes;
}

function getNetworkConnections(port) {
  try {
    const result = execSync(`lsof -i :${port}`, { encoding: 'utf8' });
    const lines = result.trim().split('\n').slice(1); // Skip header
    
    return lines.map(line => {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 9) {
        return `${parts[0]} (PID: ${parts[1]}) - ${parts[8]}`;
      }
      return line;
    });
  } catch (error) {
    return [];
  }
}

function getRecentLogs() {
  const logFile = 'boostbot.log';
  
  if (!fs.existsSync(logFile)) {
    return [];
  }
  
  try {
    const content = fs.readFileSync(logFile, 'utf8');
    const lines = content.trim().split('\n').filter(line => line.trim());
    
    // Get last 20 log entries
    const recentLines = lines.slice(-20);
    
    return recentLines.map(line => {
      try {
        const logEntry = JSON.parse(line);
        return {
          timestamp: logEntry.timestamp,
          level: logEntry.level,
          message: logEntry.message,
          data: logEntry.data
        };
      } catch {
        return { message: line, timestamp: new Date().toISOString() };
      }
    });
  } catch (error) {
    return [];
  }
}

function formatLogEntry(entry) {
  const time = new Date(entry.timestamp).toLocaleTimeString();
  const level = entry.level?.toUpperCase() || 'INFO';
  const message = entry.message || entry;
  
  let formatted = `[${time}] ${level}: ${message}`;
  
  if (entry.data) {
    if (typeof entry.data === 'object') {
      formatted += ` ${JSON.stringify(entry.data)}`;
    } else {
      formatted += ` ${entry.data}`;
    }
  }
  
  return formatted;
}

function main() {
  console.log('📋 BoostBot Logs & Information\n');
  
  // Check if bot is running
  const pids = checkIfProcessRunning('helipad-webhook');
  const isRunning = pids.length > 0;
  
  if (isRunning) {
    console.log('✅ BoostBot is running\n');
    
    const processes = getProcessInfo(pids);
    console.log('🔍 Process Information:');
    processes.forEach((proc, index) => {
      console.log(`  Process ${index + 1}:`);
      console.log(`    PID: ${proc.pid}`);
      console.log(`    CPU: ${proc.cpu}%`);
      console.log(`    Memory: ${proc.memory}%`);
      console.log(`    Runtime: ${proc.time}`);
    });
    console.log('');
    
    // Check network connections
    const connections = getNetworkConnections(3333); // Updated port
    if (connections.length > 0) {
      console.log('🌐 Network Connections (Port 3333):');
      connections.forEach(conn => console.log(`  ${conn}`));
      console.log('');
    }
  } else {
    console.log('❌ BoostBot is not running\n');
  }
  
  // Show recent logs
  const recentLogs = getRecentLogs();
  if (recentLogs.length > 0) {
    console.log('📝 Recent Activity (last 20 entries):');
    recentLogs.forEach(entry => {
      console.log(`  ${formatLogEntry(entry)}`);
    });
    console.log('');
  } else {
    console.log('📝 No recent activity found');
    console.log('');
  }
  
  // Health check
  try {
    const healthResult = execSync('curl -s http://localhost:3333/health', { encoding: 'utf8' });
    console.log('🏥 Health Check:');
    console.log(`  ✅ Health endpoint: ${healthResult.trim()}`);
  } catch (error) {
    console.log('🏥 Health Check:');
    console.log('  ❌ Health endpoint not responding');
  }
  console.log('');
  
  // Available endpoints
  console.log('🔗 Available Endpoints:');
  console.log('  📡 POST /helipad-webhook - Main webhook endpoint');
  console.log('  💚 GET  /health - Health check');
  console.log('  🧪 GET  /test-daily-summary - Test daily summary');
  console.log('  📊 GET  /test-weekly-summary - Test weekly summary');
  console.log('');
  
  console.log('💡 Tips:');
  console.log('  • Use "npm run status" for a quick status check');
  console.log('  • Use "npm run restart" to restart the bot');
  console.log('  • Check the terminal where you started the bot for live logs');
  console.log('  • The bot logs all webhook events and Nostr posts to boostbot.log');
}

main(); 