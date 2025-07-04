// helipad-webhook.js
import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { exec, execSync, spawn } from 'child_process';
import { promisify } from 'util';
import { announceHelipadPayment, postTestDailySummary, postTestWeeklySummary, initializeSummaryScheduling } from './lib/nostr-bot.ts';
import { logger } from './lib/logger.js';
import { karmaSystem } from './lib/karma-system.ts';

const execAsync = promisify(exec);

// Store active monitor connections
const monitorClients = new Set();

// Store last activity information
let lastActivityData = {
  timestamp: null,
  message: 'No recent activity',
  type: 'none'
};

// Store bot start time
const botStartTime = new Date();

// Monitor functions (adapted from monitor.js)
function getProcessInfo() {
  try {
    const output = execSync('ps aux | grep -E "(helipad-webhook|tsx.*helipad)" | grep -v grep', { encoding: 'utf8' });
    return output.trim().split('\n').filter(line => line.trim());
  } catch (error) {
    logger.debug('getProcessInfo error:', error.message);
    return [];
  }
}

function getHealthStatus(port = 3333) {
  try {
    const response = execSync(`curl -s http://127.0.0.1:${port}/health`, { encoding: 'utf8', timeout: 5000 });
    return { statusCode: 200, body: response.trim(), timestamp: new Date().toISOString() };
  } catch (error) {
    logger.debug('getHealthStatus error:', error.message);
    return { statusCode: 0, body: 'Connection failed or timed out', timestamp: new Date().toISOString() };
  }
}

function getMonitorStatus() {
  const processes = getProcessInfo();
  const health = getHealthStatus(process.env.PORT || 3333);
  
  const status = {
    timestamp: new Date().toISOString(),
    isRunning: processes.length > 0,
    processCount: processes.length,
    health: health,
    uptime: null,
    uptimeSeconds: null
  };
  
  if (processes.length > 0) {
    // Calculate uptime based on bot start time
    const now = new Date();
    const uptimeMs = now - botStartTime;
    const totalSeconds = Math.floor(uptimeMs / 1000);
    
    status.uptimeSeconds = totalSeconds;
    
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    
    if (days > 0) {
      status.uptime = `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      status.uptime = `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      status.uptime = `${minutes}m`;
    } else {
      status.uptime = `${totalSeconds}s`;
    }
  }
  
  return status;
}

function broadcastToMonitorClients(data) {
  monitorClients.forEach(client => {
    try {
      client.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (error) {
      // Remove dead connections
      monitorClients.delete(client);
    }
  });
}

dotenv.config();

const app = express();
app.use(bodyParser.json());



// Serve static files from public directory (after root route)
app.use(express.static('public'));

const AUTH_TOKEN = process.env.HELIPAD_WEBHOOK_TOKEN;

// Middleware for authentication
const authenticate = (req, res, next) => {
  if (!AUTH_TOKEN) {
    // If no token is set in the environment, skip auth
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn('Missing or invalid Authorization header - TEMPORARILY ALLOWING FOR TESTING');
    // Temporarily allow requests without proper auth for testing
    return next();
  }

  const token = authHeader.substring(7); // Remove 'Bearer '
  if (token !== AUTH_TOKEN) {
    logger.warn('Invalid token received - TEMPORARILY ALLOWING FOR TESTING');
    // Temporarily allow invalid tokens for testing
    return next();
  }

  next();
};

// SENT BOOSTS WEBHOOK - Port 3333 (SENT BOOSTS ONLY)
app.post('/helipad-webhook', authenticate, async (req, res) => {
  try {
    const event = req.body;
    logger.info('Received Helipad webhook', { event });
    
    // Broadcast webhook activity to live monitors
    const satsAmount = Math.floor(event.value_msat_total / 1000);
    const actionName = {
      0: 'Error',
      1: 'Stream',
      2: 'Boost',
      3: 'Unknown',
      4: 'Auto Boost'
    }[event.action] || 'Unknown';
    
    const activityMessage = `💰 ${actionName}: ${satsAmount} sats from ${event.sender || 'Unknown'} → ${event.podcast || 'Unknown'}${event.message ? ` | "${event.message.substring(0, 50)}${event.message.length > 50 ? '...' : ''}"` : ''}`;
    
    // Update last activity
    lastActivityData = {
      timestamp: new Date().toISOString(),
      message: activityMessage,
      type: 'activity',
      action: event.action,
      amount: satsAmount,
      sender: event.sender,
      podcast: event.podcast,
      episode: event.episode
    };
    
    broadcastToMonitorClients({
      timestamp: new Date().toISOString(),
      message: activityMessage,
      type: 'activity',
      action: event.action,
      amount: satsAmount,
      sender: event.sender,
      podcast: event.podcast,
      episode: event.episode
    });
    
    // Track karma for boosts (action === 2) - BETA: Data collection only, no Nostr posting
    if (event.action === 2 && satsAmount > 0) {
      try {
        // Track show karma
        const showName = event.podcast || event.episode || 'Unknown Show';
        karmaSystem.addKarma(showName, 'show', 1, satsAmount);
        
        // Track episode karma if different from show
        if (event.episode && event.episode !== event.podcast) {
          const episodeName = event.episode;
          karmaSystem.addKarma(episodeName, 'track', 1, satsAmount, {
            showName: showName,
            npub: event.sender || ''
          });
        }
        
        // Track sender karma (person who sent the boost)
        if (event.sender && event.sender !== 'Unknown') {
          karmaSystem.addKarma(event.sender, 'person', 1, satsAmount);
        }
        
        logger.info(`🧪 [BETA] Karma tracked: Show "${showName}", Episode "${event.episode || 'N/A'}", Sender "${event.sender || 'Unknown'}" (+${satsAmount} sats)`);
      } catch (karmaError) {
        logger.error('Error tracking karma:', karmaError);
      }
    }
    
    await announceHelipadPayment(event);
    
    res.status(200).send('OK');
  } catch (err) {
    logger.error('Error posting to Nostr', { error: err.message, stack: err.stack });
    
    // Broadcast error to live monitors
    broadcastToMonitorClients({
      timestamp: new Date().toISOString(),
      message: `❌ Error processing webhook: ${err.message}`,
      type: 'error'
    });
    
    res.status(500).send('Error');
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('Webhook receiver is running');
});

// Uptime endpoint
app.get('/uptime', (req, res) => {
  const status = getMonitorStatus();
  res.json({
    uptime: status.uptime,
    uptimeSeconds: status.uptimeSeconds,
    isRunning: status.isRunning,
    processCount: status.processCount,
    timestamp: status.timestamp
  });
});

// Last activity endpoint
app.get('/last-activity', (req, res) => {
  const now = new Date();
  let timeAgo = 'No activity';
  
  if (lastActivityData.timestamp) {
    const activityTime = new Date(lastActivityData.timestamp);
    const diffMs = now - activityTime;
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffDays > 0) {
      timeAgo = `${diffDays}d ago`;
    } else if (diffHours > 0) {
      timeAgo = `${diffHours}h ago`;
    } else if (diffMinutes > 0) {
      timeAgo = `${diffMinutes}m ago`;
    } else {
      timeAgo = 'Just now';
    }
  }
  
  res.json({
    ...lastActivityData,
    timeAgo: timeAgo
  });
});

// Test daily summary endpoint
app.get('/test-daily-summary', async (req, res) => {
  try {
    logger.info('Test daily summary requested');
    await postTestDailySummary();
    res.status(200).send('Test daily summary posted to Nostr');
  } catch (err) {
    logger.error('Error posting test daily summary', { error: err.message, stack: err.stack });
    res.status(500).send('Error posting test daily summary');
  }
});

// Test weekly summary endpoint
app.get('/test-weekly-summary', async (req, res) => {
  try {
    logger.info('Test weekly summary requested');
    await postTestWeeklySummary();
    res.status(200).send('Test weekly summary posted to Nostr');
  } catch (err) {
    logger.error('Error posting test weekly summary', { error: err.message, stack: err.stack });
    res.status(500).send('Error posting test weekly summary');
  }
});

// Bot management endpoints
app.post('/manage/:action', async (req, res) => {
  const { action } = req.params;
  logger.info(`Management action requested: ${action}`);
  
  try {
    let result;
    const workingDir = process.cwd(); // Get current working directory
    
    // Helper function to add timeout to execAsync
    const execWithTimeout = async (command, timeoutMs = 10000) => {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Command timed out')), timeoutMs);
      });
      
      const execPromise = execAsync(command, { cwd: workingDir });
      
      return Promise.race([execPromise, timeoutPromise]);
    };
    
    switch (action) {
      case 'status':
        result = await execWithTimeout('npm run status', 10000);
        break;
        
      case 'restart':
        // In Docker environment, we can't restart the container from within
        // Instead, we'll signal a graceful restart by updating a restart flag
        try {
          // Create a restart flag file that the entrypoint script can check
          const restartFlagPath = path.join(process.env.DATA_DIR || './data', 'restart-requested');
          fs.writeFileSync(restartFlagPath, new Date().toISOString());
          
          result = { 
            stdout: 'Restart request sent. The container will restart shortly. The web interface will reconnect automatically.',
            stderr: ''
          };
          
          // Broadcast restart notification to live monitors
          broadcastToMonitorClients({
            timestamp: new Date().toISOString(),
            message: '🔄 Restart request received - container will restart shortly',
            type: 'info'
          });
          
          // Exit the process after a short delay to trigger container restart
          setTimeout(() => {
            logger.info('Restarting container as requested');
            process.exit(0);
          }, 2000);
          
        } catch (error) {
          result = { 
            stdout: 'Failed to initiate restart: ' + error.message,
            stderr: error.message
          };
        }
        break;
        
      case 'stop':
        result = await execWithTimeout('npm run stop', 10000);
        break;
        
      case 'logs':
        // Get logs from various sources in Docker environment
        try {
          let logOutput = '';
          
          // Show recent console output (what would be in Docker logs)
          logOutput += '=== Recent Console Output ===\n';
          logOutput += 'Note: In Docker environment, console output goes to Docker logs.\n';
          logOutput += 'Use "docker logs helipad-boostbot" from the host to see full logs.\n\n';
          
          // Try to get Docker logs first (from host perspective)
          try {
            const dockerLogs = execSync('docker logs --tail 50 helipad-boostbot 2>/dev/null', { encoding: 'utf8', timeout: 5000 });
            logOutput += '=== Docker Container Logs (Last 50 lines) ===\n';
            logOutput += dockerLogs + '\n\n';
          } catch (dockerError) {
            logOutput += '=== Docker Logs (unavailable from container) ===\n';
            logOutput += 'Docker logs command failed: ' + dockerError.message + '\n';
            logOutput += 'To view Docker logs, run: docker logs helipad-boostbot\n\n';
          }
          
          // Try to get application log files
          const logFiles = [
            path.join(process.env.DATA_DIR || './data', 'boostbot.log'),
            path.join(process.env.DATA_DIR || './data', 'nostr-bot.log'),
            path.join(process.env.DATA_DIR || './data', 'karma-system.log'),
            'boostbot.log', // Fallback to current directory
            'logs/helipad-webhook.log', // Legacy log location
            'logs/launch-agent.log' // Legacy log location
          ];
          
          logOutput += '=== Application Log Files ===\n';
          let foundLogs = false;
          
          for (const logFile of logFiles) {
            try {
              if (fs.existsSync(logFile)) {
                const stats = fs.statSync(logFile);
                if (stats.size > 0) {
                  logOutput += `--- ${logFile} (${stats.size} bytes) ---\n`;
                  const content = fs.readFileSync(logFile, 'utf8');
                  const lines = content.split('\n').filter(line => line.trim());
                  const lastLines = lines.slice(-20); // Last 20 lines
                  logOutput += lastLines.join('\n') + '\n\n';
                  foundLogs = true;
                }
              }
            } catch (error) {
              logOutput += `--- ${logFile} (error: ${error.message}) ---\n\n`;
            }
          }
          
          if (!foundLogs) {
            logOutput += 'No application log files found.\n';
            logOutput += 'Available files in data directory:\n';
            try {
              const dataDir = process.env.DATA_DIR || './data';
              if (fs.existsSync(dataDir)) {
                const files = fs.readdirSync(dataDir);
                files.forEach(file => {
                  const filePath = path.join(dataDir, file);
                  const stats = fs.statSync(filePath);
                  logOutput += `  ${file} (${stats.size} bytes)\n`;
                });
              }
            } catch (error) {
              logOutput += `  Error reading data directory: ${error.message}\n`;
            }
          }
          
          // Add helpful information
          logOutput += '\n=== Log Management ===\n';
          logOutput += '• Docker logs: docker logs helipad-boostbot\n';
          logOutput += '• Follow logs: docker logs -f helipad-boostbot\n';
          logOutput += '• Recent logs: docker logs --tail 100 helipad-boostbot\n';
          logOutput += '• Container logs are stored in Docker\'s log system\n';
          logOutput += '• Application logs (if any) are in /app/data/\n';
          
          result = { stdout: logOutput, stderr: '' };
          
        } catch (error) {
          result = { 
            stdout: 'Failed to retrieve logs: ' + error.message,
            stderr: error.message
          };
        }
        break;
        
      case 'service-status':
        result = await execWithTimeout('npm run service-status', 10000);
        break;
        
      case 'health':
        result = await execWithTimeout('npm run health', 5000);
        break;
        
      default:
        return res.status(400).json({
          success: false,
          error: `Unknown action: ${action}`
        });
    }
    
    res.json({
      success: true,
      output: result.stdout || result.stderr || 'Command executed successfully'
    });
    
  } catch (error) {
    logger.error(`Management action failed: ${action}`, { error: error.message });
    res.json({
      success: false,
      error: error.message,
      output: error.stdout || error.stderr || 'Command failed'
    });
  }
});

// Docker logs streaming endpoint
app.get('/logs/stream', (req, res) => {
  // Set up SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  logger.info('Docker logs stream client connected');

  try {
    // Read logs from the application's own log files instead of Docker
    const logFiles = [
      path.join(process.env.DATA_DIR || './data', 'boostbot.log'),
      path.join(process.env.DATA_DIR || './data', 'nostr-bot.log'),
      path.join(process.env.DATA_DIR || './data', 'karma-system.log')
    ];

    // Send initial connection message
    res.write(`data: ${JSON.stringify({
      timestamp: new Date().toISOString(),
      message: 'Connected to application logs stream',
      type: 'info'
    })}\n\n`);

    // Function to read and send log files
    const readAndSendLogs = () => {
      logFiles.forEach(logFile => {
        try {
          if (fs.existsSync(logFile)) {
            const stats = fs.statSync(logFile);
            const lastModified = stats.mtime;
            
            // Read the last 50 lines of each log file
            const content = fs.readFileSync(logFile, 'utf8');
            const lines = content.split('\n').filter(line => line.trim());
            const lastLines = lines.slice(-50);
            
            lastLines.forEach(line => {
              try {
                res.write(`data: ${JSON.stringify({
                  timestamp: new Date().toISOString(),
                  message: `[${path.basename(logFile)}] ${line}`,
                  type: 'log'
                })}\n\n`);
              } catch (error) {
                logger.error('Error writing log data to client:', error.message);
              }
            });
          }
        } catch (error) {
          logger.error(`Error reading log file ${logFile}:`, error.message);
        }
      });
    };

    // Send initial logs
    readAndSendLogs();

    // Set up periodic log reading (every 2 seconds)
    const logInterval = setInterval(() => {
      try {
        readAndSendLogs();
      } catch (error) {
        logger.error('Error in periodic log reading:', error.message);
      }
    }, 2000);

    // Handle client disconnect
    req.on('close', () => {
      logger.info('Logs stream client disconnected');
      clearInterval(logInterval);
    });

  } catch (error) {
    logger.error('Error setting up logs stream:', error.message);
    res.write(`data: ${JSON.stringify({
      timestamp: new Date().toISOString(),
      message: `Failed to start logs stream: ${error.message}`,
      type: 'error'
    })}\n\n`);
  }
});

// Live monitor endpoint using Server-Sent Events
app.get('/monitor/live', (req, res) => {
  // Set up SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  // Add client to the set
  monitorClients.add(res);
  logger.info('Live monitor client connected', { clientCount: monitorClients.size });

  // Send initial status
  try {
    const initialStatus = getMonitorStatus();
    logger.info('Sending initial monitor status', initialStatus);
    
    const statusMessage = {
      timestamp: initialStatus.timestamp,
      message: `BoostBot Status: ${initialStatus.isRunning ? 'Running' : 'Stopped'} (${initialStatus.processCount} processes, Health: ${initialStatus.health.statusCode === 200 ? 'OK' : 'Failed'})`,
      type: 'status',
      isRunning: initialStatus.isRunning,
      processCount: initialStatus.processCount,
      health: initialStatus.health,
      uptime: initialStatus.uptime
    };
    
    res.write(`data: ${JSON.stringify(statusMessage)}\n\n`);
  } catch (error) {
    logger.error('Error getting initial monitor status:', error);
    res.write(`data: ${JSON.stringify({
      timestamp: new Date().toISOString(),
      message: 'Error getting initial status: ' + error.message,
      type: 'error'
    })}\n\n`);
  }

  // Handle client disconnect
  req.on('close', () => {
    monitorClients.delete(res);
    logger.info('Live monitor client disconnected', { clientCount: monitorClients.size });
  });
});

// Start periodic monitoring when server starts
let monitorInterval;
let lastStatus = null;

function startPeriodicMonitoring() {
  monitorInterval = setInterval(() => {
    if (monitorClients.size === 0) return; // No clients, skip monitoring
    
    const currentStatus = getMonitorStatus();
    
    // Check for status changes
    let statusChanged = false;
    let changeMessage = '';
    
    if (lastStatus) {
      if (lastStatus.isRunning !== currentStatus.isRunning) {
        statusChanged = true;
        if (currentStatus.isRunning) {
          changeMessage = '🎉 BoostBot has started!';
        } else {
          changeMessage = '⚠️ BoostBot has stopped!';
        }
      } else if (lastStatus.processCount !== currentStatus.processCount) {
        statusChanged = true;
        changeMessage = `Process count changed: ${lastStatus.processCount} → ${currentStatus.processCount}`;
      } else if (lastStatus.health.statusCode !== currentStatus.health.statusCode) {
        statusChanged = true;
        changeMessage = `Health status changed: ${lastStatus.health.statusCode} → ${currentStatus.health.statusCode}`;
      }
    }
    
    // Broadcast status update
    const statusMessage = `Status: ${currentStatus.isRunning ? 'Running' : 'Stopped'} | Processes: ${currentStatus.processCount} | Health: ${currentStatus.health.statusCode === 200 ? 'OK' : 'Failed'}${currentStatus.uptime ? ` | Uptime: ${currentStatus.uptime}` : ''}`;
    
    broadcastToMonitorClients({
      timestamp: currentStatus.timestamp,
      message: statusMessage,
      type: 'status',
      isRunning: currentStatus.isRunning,
      processCount: currentStatus.processCount,
      health: currentStatus.health,
      uptime: currentStatus.uptime
    });
    
    // Broadcast status change if any
    if (statusChanged) {
      broadcastToMonitorClients({
        timestamp: currentStatus.timestamp,
        message: changeMessage,
        type: currentStatus.isRunning ? 'info' : 'warning'
      });
    }
    
    lastStatus = currentStatus;
  }, 5000); // Update every 5 seconds
}

const PORT = process.env.PORT || 3333;
app.listen(PORT, '0.0.0.0', async () => {
  logger.info(`Helipad webhook receiver started`, { port: PORT });
  logger.info(`Webhook URL: http://localhost:${PORT}/helipad-webhook`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
  logger.info(`Management UI: http://localhost:${PORT}/`);
  
  // Initialize summary scheduling at startup
  try {
    await initializeSummaryScheduling();
  } catch (error) {
    logger.error('Failed to initialize summary scheduling:', { error: error.message });
  }
  
  // Start periodic monitoring
  startPeriodicMonitoring();
}); 