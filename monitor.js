#!/usr/bin/env node

import { execSync } from 'child_process';
import { writeFileSync, readFileSync, existsSync } from 'fs';

const STATUS_FILE = 'bot-status.json';

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
    const response = execSync('curl -s -w "%{http_code}" http://localhost:3001/health', { encoding: 'utf8' });
    const statusCode = response.slice(-3);
    const body = response.slice(0, -3);
    return { statusCode: parseInt(statusCode), body: body.trim(), timestamp: new Date().toISOString() };
  } catch (error) {
    return { statusCode: 0, body: 'Connection failed', timestamp: new Date().toISOString() };
  }
}

function saveStatus(status) {
  writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2));
}

function loadStatus() {
  if (existsSync(STATUS_FILE)) {
    try {
      return JSON.parse(readFileSync(STATUS_FILE, 'utf8'));
    } catch (error) {
      return null;
    }
  }
  return null;
}

function main() {
  const processes = getProcessInfo();
  const health = getHealthStatus();
  
  const status = {
    timestamp: new Date().toISOString(),
    isRunning: processes.length > 0,
    processCount: processes.length,
    health: health,
    uptime: null
  };
  
  if (processes.length > 0) {
    const parts = processes[0].split(/\s+/);
    status.uptime = parts[8]; // Process time
  }
  
  saveStatus(status);
  
  // Display status
  console.log(`🤖 BoostBot Monitor - ${new Date().toLocaleString()}`);
  console.log(`Status: ${status.isRunning ? '✅ Running' : '❌ Stopped'}`);
  console.log(`Processes: ${status.processCount}`);
  console.log(`Health: ${health.statusCode === 200 ? '✅ OK' : '❌ Failed'}`);
  if (status.uptime) {
    console.log(`Uptime: ${status.uptime}`);
  }
  console.log('');
  
  // Check for status changes
  const previousStatus = loadStatus();
  if (previousStatus && previousStatus.isRunning !== status.isRunning) {
    if (status.isRunning) {
      console.log('🎉 BoostBot has started!');
    } else {
      console.log('⚠️  BoostBot has stopped!');
    }
  }
}

// Run once if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main as checkStatus }; 