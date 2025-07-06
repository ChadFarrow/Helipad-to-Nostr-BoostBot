import fs from 'fs';
import path from 'path';

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

function monitorLogs() {
  const logFile = 'boostbot.log';
  
  console.log('🔍 BoostBot Real-Time Monitor');
  console.log('Press Ctrl+C to stop monitoring\n');
  
  if (!fs.existsSync(logFile)) {
    console.log('No log file found. Waiting for bot to start...');
  }
  
  let lastLineCount = 0;
  
  const checkForUpdates = () => {
    try {
      if (!fs.existsSync(logFile)) {
        return;
      }
      
      const content = fs.readFileSync(logFile, 'utf8');
      const lines = content.trim().split('\n').filter(line => line.trim());
      
      // Show new lines since last check
      if (lines.length > lastLineCount) {
        const newLines = lines.slice(lastLineCount);
        
        newLines.forEach(line => {
          try {
            const logEntry = JSON.parse(line);
            console.log(`  ${formatLogEntry(logEntry)}`);
          } catch {
            console.log(`  ${line}`);
          }
        });
        
        lastLineCount = lines.length;
      }
    } catch (error) {
      // File might be temporarily unavailable
    }
  };
  
  // Initial check to set the baseline
  if (fs.existsSync(logFile)) {
    const content = fs.readFileSync(logFile, 'utf8');
    const lines = content.trim().split('\n').filter(line => line.trim());
    lastLineCount = lines.length;
  }
  
  // Check for updates every 100ms for more responsive monitoring
  const interval = setInterval(checkForUpdates, 100);
  
  // Handle Ctrl+C
  process.on('SIGINT', () => {
    clearInterval(interval);
    console.log('\n👋 Monitoring stopped');
    process.exit(0);
  });
}

monitorLogs(); 