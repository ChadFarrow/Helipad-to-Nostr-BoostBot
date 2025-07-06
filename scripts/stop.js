#!/usr/bin/env node

import { execSync } from 'child_process';

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

function main() {
  console.log('🛑 Stopping BoostBot...\n');
  
  const pids = getProcessPids();
  
  if (pids.length === 0) {
    console.log('❌ No BoostBot processes found to stop');
    return;
  }
  
  console.log(`📊 Found ${pids.length} process(es) to stop:`);
  pids.forEach(pid => console.log(`  PID: ${pid}`));
  console.log('');
  
  let stoppedCount = 0;
  
  pids.forEach(pid => {
    try {
      console.log(`🔄 Stopping process ${pid}...`);
      execSync(`kill ${pid}`, { encoding: 'utf8' });
      console.log(`✅ Successfully stopped process ${pid}`);
      stoppedCount++;
    } catch (error) {
      console.log(`❌ Failed to stop process ${pid}: ${error.message}`);
    }
  });
  
  console.log(`\n📊 Stopped ${stoppedCount} out of ${pids.length} processes`);
  
  // Wait a moment and check if any processes are still running
  setTimeout(() => {
    const remainingPids = getProcessPids();
    if (remainingPids.length > 0) {
      console.log(`⚠️  ${remainingPids.length} process(es) still running. Force killing...`);
      remainingPids.forEach(pid => {
        try {
          execSync(`kill -9 ${pid}`, { encoding: 'utf8' });
          console.log(`💀 Force killed process ${pid}`);
        } catch (error) {
          console.log(`❌ Failed to force kill process ${pid}: ${error.message}`);
        }
      });
    } else {
      console.log('✅ All BoostBot processes have been stopped');
    }
  }, 2000);
}

main(); 