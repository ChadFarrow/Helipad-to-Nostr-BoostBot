#!/usr/bin/env node

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Detect if running in Docker container
function isDockerContainer() {
  try {
    // Check for Docker environment variables
    if (process.env.DOCKER_CONTAINER || process.env.HOSTNAME?.match(/^[a-f0-9]{12}$/)) {
      return true;
    }
    
    // Check cgroup for Docker
    const cgroup = readFileSync('/proc/1/cgroup', 'utf8');
    return cgroup.includes('docker') || cgroup.includes('kubepods');
  } catch (error) {
    // If we can't read cgroup, check for common Docker indicators
    try {
      const hostname = execSync('hostname', { encoding: 'utf8' }).trim();
      return hostname.length === 12 && /^[a-f0-9]{12}$/.test(hostname); // Docker container ID format
    } catch (e) {
      return false;
    }
  }
}

// Get server IP address
function getServerIP() {
  try {
    // Try to get the external IP or use environment variable
    const serverIP = process.env.SERVER_IP || process.env.HOST_IP;
    if (serverIP) return serverIP;
    
    // Try to get IP from network interfaces
    const output = execSync('hostname -I', { encoding: 'utf8' });
    const ips = output.trim().split(/\s+/);
    // Return the first non-localhost IP
    return ips.find(ip => ip && ip !== '127.0.0.1' && ip !== '::1') || 'localhost';
  } catch (error) {
    return 'localhost';
  }
}

function getProcessInfo() {
  try {
    const output = execSync('ps aux | grep -E "(helipad-webhook|tsx.*helipad|node.*helipad)" | grep -v grep', { encoding: 'utf8' });
    return output.trim().split('\n').filter(line => line.trim());
  } catch (error) {
    return [];
  }
}

function getHealthStatus() {
  try {
    const response = execSync('curl -s http://127.0.0.1:3333/health', { encoding: 'utf8', timeout: 5000 });
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
  const isDocker = isDockerContainer();
  const serverIP = getServerIP();
  const port = process.env.PORT || 3333;
  
  console.log('🤖 BoostBot Status Check\n');
  
  if (isDocker) {
    console.log('🐳 Running in Docker container');
    console.log(`🌐 Server IP: ${serverIP}`);
    console.log(`🔌 Port: ${port}\n`);
  }
  
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
    if (parts.length < 10) return; // Skip malformed lines
    
    const pid = parts[1];
    const cpu = parts[2];
    const mem = parts[3];
    const time = parts[8];
    const command = parts.slice(10).join(' ');
    
    // Skip if this looks like a malformed process line
    if (!pid || isNaN(parseInt(pid))) return;
    
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
  console.log(`🔌 Port Status (${port}):`);
  const portInfo = getPortStatus();
  if (portInfo.length > 0) {
    console.log(`  ✅ Port ${port} is in use`);
    portInfo.forEach(info => {
      const parts = info.split(/\s+/);
      console.log(`  📡 Process: ${parts[0]} (PID: ${parts[1]})`);
    });
  } else {
    console.log(`  ❌ Port ${port} is not in use`);
  }
  console.log('');
  
  // Show webhook URL with appropriate host
  console.log('🌐 Webhook Information:');
  const baseUrl = isDocker ? `http://${serverIP}:${port}` : `http://localhost:${port}`;
  console.log(`  📡 Webhook URL: ${baseUrl}/helipad-webhook`);
  console.log(`  💚 Health Check: ${baseUrl}/health`);
  console.log(`  🧪 Test Daily Summary: ${baseUrl}/test-daily-summary`);
  console.log(`  📊 Test Weekly Summary: ${baseUrl}/test-weekly-summary`);
  console.log(`  🖥️  Web Dashboard: ${baseUrl}/`);
  console.log('');
  
  if (isDocker) {
    console.log('🐳 Docker Information:');
    console.log('  📦 Container: helipad-boostbot');
    console.log('  🔄 Restart: docker compose restart');
    console.log('  📋 Logs: docker compose logs -f');
    console.log('  ⏹️  Stop: docker compose down');
    console.log('');
  }
  
  console.log('💡 Management Commands:');
  console.log('  npm run status    - Check this status again');
  console.log('  npm run stop      - Stop the bot');
  console.log('  npm run restart   - Restart the bot');
  console.log('  npm run logs      - View recent logs');
  console.log('  npm run health    - Quick health check');
}

main(); 