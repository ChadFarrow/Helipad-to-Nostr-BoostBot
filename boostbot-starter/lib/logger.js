// Simple logger for BoostBot Starter
const logLevels = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

const currentLevel = process.env.LOG_LEVEL || 'INFO';
const levelValue = logLevels[currentLevel.toUpperCase()] || logLevels.INFO;

function formatMessage(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level}]`;
  
  if (data) {
    return `${prefix} ${message} ${JSON.stringify(data)}`;
  }
  return `${prefix} ${message}`;
}

export const logger = {
  error: (message, data = null) => {
    if (levelValue >= logLevels.ERROR) {
      console.error(formatMessage('ERROR', message, data));
    }
  },
  
  warn: (message, data = null) => {
    if (levelValue >= logLevels.WARN) {
      console.warn(formatMessage('WARN', message, data));
    }
  },
  
  info: (message, data = null) => {
    if (levelValue >= logLevels.INFO) {
      console.log(formatMessage('INFO', message, data));
    }
  },
  
  debug: (message, data = null) => {
    if (levelValue >= logLevels.DEBUG) {
      console.log(formatMessage('DEBUG', message, data));
    }
  }
}; 