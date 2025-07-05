// Simple logger for BoostBot Starter
// This handles all the console output with timestamps and levels

// Define log levels (higher number = more verbose)
const logLevels = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

// Get log level from environment or default to INFO
const currentLevel = process.env.LOG_LEVEL || 'INFO';
const levelValue = logLevels[currentLevel.toUpperCase()] || logLevels.INFO;

// Format log messages with timestamp and level
function formatMessage(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level}]`;
  
  if (data) {
    return `${prefix} ${message} ${JSON.stringify(data)}`;
  }
  return `${prefix} ${message}`;
}

// Export the logger object
const logger = {
  // Log errors (always shown)
  error: (message, data = null) => {
    if (levelValue >= logLevels.ERROR) {
      console.error(formatMessage('ERROR', message, data));
    }
  },
  
  // Log warnings (shown unless level is ERROR only)
  warn: (message, data = null) => {
    if (levelValue >= logLevels.WARN) {
      console.warn(formatMessage('WARN', message, data));
    }
  },
  
  // Log info messages (default level)
  info: (message, data = null) => {
    if (levelValue >= logLevels.INFO) {
      console.log(formatMessage('INFO', message, data));
    }
  },
  
  // Log debug messages (only shown when LOG_LEVEL=DEBUG)
  debug: (message, data = null) => {
    if (levelValue >= logLevels.DEBUG) {
      console.log(formatMessage('DEBUG', message, data));
    }
  }
};

module.exports = { logger }; 