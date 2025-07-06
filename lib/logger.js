import fs from 'fs';
import path from 'path';

class Logger {
  constructor() {
    this.logFile = 'boostbot.log';
    this.maxLogSize = 1024 * 1024; // 1MB
    this.maxLogFiles = 5;
  }

  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data
    };

    // Console output
    const consoleMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    if (data) {
      console.log(consoleMessage, data);
    } else {
      console.log(consoleMessage);
    }

    // File output
    this.writeToFile(logEntry);
  }

  info(message, data = null) {
    this.log('info', message, data);
  }

  warn(message, data = null) {
    this.log('warn', message, data);
  }

  error(message, data = null) {
    this.log('error', message, data);
  }

  debug(message, data = null) {
    this.log('debug', message, data);
  }

  writeToFile(logEntry) {
    try {
      const logLine = JSON.stringify(logEntry) + '\n';
      fs.appendFileSync(this.logFile, logLine);
      
      // Rotate logs if file gets too large
      this.rotateLogsIfNeeded();
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  rotateLogsIfNeeded() {
    try {
      const stats = fs.statSync(this.logFile);
      if (stats.size > this.maxLogSize) {
        // Rotate existing log files
        for (let i = this.maxLogFiles - 1; i > 0; i--) {
          const oldFile = `${this.logFile}.${i}`;
          const newFile = `${this.logFile}.${i + 1}`;
          if (fs.existsSync(oldFile)) {
            fs.renameSync(oldFile, newFile);
          }
        }
        
        // Move current log to .1
        fs.renameSync(this.logFile, `${this.logFile}.1`);
        
        // Create new log file
        fs.writeFileSync(this.logFile, '');
      }
    } catch (error) {
      console.error('Failed to rotate logs:', error);
    }
  }

  getRecentLogs(lines = 50) {
    try {
      if (!fs.existsSync(this.logFile)) {
        return [];
      }

      const content = fs.readFileSync(this.logFile, 'utf8');
      const logLines = content.trim().split('\n').filter(line => line.trim());
      
      return logLines.slice(-lines).map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return { message: line, timestamp: new Date().toISOString() };
        }
      });
    } catch (error) {
      console.error('Failed to read log file:', error);
      return [];
    }
  }

  clearLogs() {
    try {
      if (fs.existsSync(this.logFile)) {
        fs.unlinkSync(this.logFile);
      }
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
  }
}

export const logger = new Logger(); 