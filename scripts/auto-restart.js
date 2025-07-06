#!/usr/bin/env node

import { execSync } from 'child_process';
import { spawn } from 'child_process';

const CHECK_INTERVAL = 60000; // 1 minute
const MAX_RESTARTS = 5; // Max restarts per hour
let restartCount = 0;
let lastRestartTime = 0;

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
    return parseInt(statusCode);
  } catch (error) {
    return 0;
  }
}

function isHealthy() {
  const processes = getProcessInfo();
  const health = getHealthStatus();
  
  return processes.length > 0 && health === 200;
}

function restartBot() {
  const now = Date.now();
  
  // Reset restart count if more than an hour has passed
  if (now - lastRestartTime > 3600000) { // 1 hour
    restartCount = 0;
  }
  
  if (restartCount >= MAX_RESTARTS) {
    console.log(`❌ Maximum restart attempts (${MAX_RESTARTS}) reached. Stopping auto-restart.`);
    process.exit(1);
  }
  
  console.log(`🔄 Restarting BoostBot (attempt ${restartCount + 1}/${MAX_RESTARTS})...`);
  
  try {
    // Stop existing processes
    execSync('npm run stop', { stdio: 'pipe' });
    
    // Wait a moment
    setTimeout(() => {
      // Start the bot
      const child = spawn('npm', ['start'], {
        stdio: 'inherit',
        shell: true
      });
      
      child.on('error', (error) => {
        console.error('❌ Failed to restart BoostBot:', error.message);
        restartCount++;
        lastRestartTime = now;
      });
      
      child.on('exit', (code) => {
        if (code !== 0) {
          console.error(`❌ BoostBot exited with code ${code}`);
          restartCount++;
          lastRestartTime = now;
        }
      });
      
      console.log('✅ BoostBot restarted successfully');
    }, 2000);
    
  } catch (error) {
    console.error('❌ Failed to restart BoostBot:', error.message);
    restartCount++;
    lastRestartTime = now;
  }
}

function main() {
  console.log('🤖 BoostBot Auto-Restart Monitor Started');
  console.log(`📊 Check interval: ${CHECK_INTERVAL / 1000} seconds`);
  console.log(`🔄 Max restarts per hour: ${MAX_RESTARTS}`);
  console.log('Press Ctrl+C to stop\n');
  
  const checkInterval = setInterval(() => {
    const timestamp = new Date().toLocaleString();
    
    if (isHealthy()) {
      console.log(`✅ [${timestamp}] BoostBot is healthy`);
    } else {
      console.log(`❌ [${timestamp}] BoostBot is unhealthy - restarting...`);
      restartBot();
    }
  }, CHECK_INTERVAL);
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Auto-restart monitor stopped');
    clearInterval(checkInterval);
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('\n🛑 Auto-restart monitor stopped');
    clearInterval(checkInterval);
    process.exit(0);
  });
}

main(); 