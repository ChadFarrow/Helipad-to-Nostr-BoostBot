#!/usr/bin/env node

import { execSync } from 'child_process';
import { spawn } from 'child_process';

function getProcessPids() {
  try {
    const output = execSync('ps aux | grep -E "(helipad-webhook|tsx.*helipad)" | grep -v grep', { encoding: 'utf8' });
    return output.trim().split('\n')
      .filter(line => line.trim())
      .map(line => line.split(/\s+/)[1]);
  } catch (error) {
    return [];
  }
}

function stopProcesses() {
  console.log('🛑 Stopping existing processes...');
  
  const pids = getProcessPids();
  
  if (pids.length === 0) {
    console.log('✅ No processes to stop');
    return true;
  }
  
  let stoppedCount = 0;
  
  pids.forEach(pid => {
    try {
      execSync(`kill ${pid}`, { encoding: 'utf8' });
      stoppedCount++;
    } catch (error) {
      console.log(`❌ Failed to stop process ${pid}: ${error.message}`);
    }
  });
  
  console.log(`📊 Stopped ${stoppedCount} out of ${pids.length} processes`);
  
  // Force kill any remaining processes
  setTimeout(() => {
    const remainingPids = getProcessPids();
    if (remainingPids.length > 0) {
      console.log(`⚠️  Force killing ${remainingPids.length} remaining process(es)...`);
      remainingPids.forEach(pid => {
        try {
          execSync(`kill -9 ${pid}`, { encoding: 'utf8' });
        } catch (error) {
          console.log(`❌ Failed to force kill process ${pid}: ${error.message}`);
        }
      });
    }
  }, 2000);
  
  return stoppedCount > 0;
}

function startBot() {
  console.log('\n🚀 Starting BoostBot...');
  
  const child = spawn('npm', ['start'], {
    stdio: 'inherit',
    shell: true
  });
  
  child.on('error', (error) => {
    console.error('❌ Failed to start BoostBot:', error.message);
    process.exit(1);
  });
  
  child.on('exit', (code) => {
    if (code !== 0) {
      console.error(`❌ BoostBot exited with code ${code}`);
      process.exit(code);
    }
  });
  
  // Wait a moment and check if the bot started successfully
  setTimeout(() => {
    try {
      const response = execSync('curl -s http://localhost:3001/health', { encoding: 'utf8' });
      if (response.includes('Webhook receiver is running')) {
        console.log('\n✅ BoostBot restarted successfully!');
        console.log('🌐 Health check: http://localhost:3001/health');
        console.log('📡 Webhook URL: http://localhost:3001/helipad-webhook');
      } else {
        console.log('\n⚠️  BoostBot may not have started properly');
      }
    } catch (error) {
      console.log('\n⚠️  Health check failed - bot may still be starting up');
    }
  }, 3000);
}

function main() {
  console.log('🔄 Restarting BoostBot...\n');
  
  const hadProcesses = stopProcesses();
  
  if (hadProcesses) {
    // Wait a bit for processes to fully stop
    setTimeout(() => {
      startBot();
    }, 1000);
  } else {
    startBot();
  }
}

main(); 