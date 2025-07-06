import { spawn } from 'child_process';
import fs from 'fs';

function formatLogEntry(line) {
  try {
    const logEntry = JSON.parse(line);
    const time = new Date(logEntry.timestamp).toLocaleTimeString();
    const level = logEntry.level?.toUpperCase() || 'INFO';
    const message = logEntry.message || '';
    
    let formatted = `[${time}] ${level}: ${message}`;
    
    if (logEntry.data) {
      if (typeof logEntry.data === 'object') {
        formatted += ` ${JSON.stringify(logEntry.data)}`;
      } else {
        formatted += ` ${logEntry.data}`;
      }
    }
    
    return formatted;
  } catch {
    // If it's not JSON, just return the line as-is
    return line;
  }
}

function monitorLogsWithTail() {
  const logFile = 'boostbot.log';
  
  console.log('🔍 BoostBot Real-Time Monitor (Simple)');
  console.log('Press Ctrl+C to stop monitoring\n');
  
  if (!fs.existsSync(logFile)) {
    console.log('No log file found. Waiting for bot to start...');
    console.log('The monitor will start automatically when the log file is created.\n');
  }
  
  // Use tail -f to monitor the log file in real-time
  const tail = spawn('tail', ['-f', logFile]);
  
  tail.stdout.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach(line => {
      if (line.trim()) {
        console.log(`  ${formatLogEntry(line.trim())}`);
      }
    });
  });
  
  tail.stderr.on('data', (data) => {
    console.error(`Tail error: ${data}`);
  });
  
  // Handle Ctrl+C
  process.on('SIGINT', () => {
    tail.kill();
    console.log('\n👋 Monitoring stopped');
    process.exit(0);
  });
  
  // Handle process exit
  tail.on('close', (code) => {
    console.log(`\nTail process exited with code ${code}`);
    process.exit(0);
  });
}

monitorLogsWithTail(); 