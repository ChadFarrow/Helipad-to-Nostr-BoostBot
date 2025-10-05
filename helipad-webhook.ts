// helipad-webhook.js
import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import { announceHelipadPayment, postTestDailySummary, postTestWeeklySummary } from './lib/nostr-bot.ts';
import { musicShowBot } from './lib/music-show-bot.ts';
import { logger } from './lib/logger.js';

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

// Serve static files from public directory
app.use(express.static('public'));

// Authentication disabled - webhook is now open
app.post('/helipad-webhook', async (req, res) => {
  try {
    const event = req.body;
    logger.info('Received Helipad webhook', { event });
    
    // Log the full event structure for debugging music shows
    if (event.remote_item_guid || event.remote_feed_guid || event.name) {
      console.log('🎵 Full music webhook data:', JSON.stringify(event, null, 2));
    }
    
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
    
    await announceHelipadPayment(event);

    // Process music show events for song tracking - ONLY for streaming (action 1), not boosts (action 2)
    // Check for both old format (remote_podcast/remote_episode) and new format (remote_item_guid/remote_feed_guid)
    if (event.action === 1 && ((event.remote_podcast && event.remote_episode) || (event.remote_item_guid && event.remote_feed_guid))) {
      try {
        let artist = undefined;
        let feedID = undefined;
        let remote_feed_guid = event.remote_feed_guid;
        let songTitle = undefined;
        let albumOrShow = undefined;
        
        // Handle different webhook formats
        if (event.remote_podcast && event.remote_episode) {
          // Old format: remote_podcast is artist/channel, remote_episode is song
          albumOrShow = event.remote_podcast;
          songTitle = event.remote_episode;
        } else if (event.remote_item_guid || event.remote_feed_guid) {
          // New PodcastGuru format or similar
          // CRITICAL: Parse the name field intelligently
          if (event.name && typeof event.name === 'string') {
            // Check if name looks like an email/identifier
            if (event.name.includes('@')) {
              // Extract artist from email format (e.g., "thetrustedband@fountain.fm" -> "The Trusted Band")
              const username = event.name.split('@')[0];
              // Convert username to readable format
              artist = username
                .replace(/([A-Z])/g, ' $1')  // Add spaces before capitals
                .replace(/[_-]/g, ' ')  // Replace underscores and hyphens with spaces
                .trim()
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ');
              console.log('🎵 Extracted artist from identifier:', event.name, '->', artist);
            } else if (!event.name.includes('via')) {
              // If it's not an email and doesn't have "via", check if it looks like a username
              if (/^[a-zA-Z][a-zA-Z0-9]*$/.test(event.name)) {
                // Convert username to readable format (handle both camelCase and lowercase)
                if (/[A-Z]/.test(event.name)) {
                  // Has capitals - convert camelCase/PascalCase
                  artist = event.name
                    .replace(/([A-Z])/g, ' $1')  // Add spaces before capitals
                    .trim()
                    .split(' ')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                    .join(' ');
                  console.log('🎵 Converted camelCase username to artist:', event.name, '->', artist);
                } else {
                  // All lowercase - just capitalize first letter
                  artist = event.name.charAt(0).toUpperCase() + event.name.slice(1).toLowerCase();
                  console.log('🎵 Converted lowercase username to artist:', event.name, '->', artist);
                }
              } else {
                // Use as-is for complex names
                artist = event.name;
                console.log('🎵 Found artist in name field:', artist);
              }
            } else {
              // Has "via" - extract the part before it
              artist = event.name.split(' via ')[0].trim();
              console.log('🎵 Extracted artist before "via":', artist);
            }
          }
          
          // Use remote_item_guid as a unique song identifier if available
          if (event.remote_item_guid) {
            albumOrShow = event.remote_item_guid;  // Use GUID as unique identifier for the album/song
            songTitle = event.remote_item_guid;  // Use GUID as unique track identifier too
          }
          
          // Log to help debug
          console.log('🎵 Music streaming event:', {
            artist: artist || 'NOT SET',
            name_field: event.name,
            remote_item_guid: event.remote_item_guid,
            podcast: event.podcast,
            episode: event.episode,
            app_name: event.app_name,
            app: event.app
          });
        }
        
        // Check TLV data for additional info (if present)
        if (event.tlv) {
          try {
            const tlvObj = typeof event.tlv === 'string' ? JSON.parse(event.tlv) : event.tlv;
            console.log('🎵 TLV Debug:', JSON.stringify(tlvObj, null, 2));
            if (tlvObj && typeof tlvObj.name === 'string' && !artist) {
              artist = tlvObj.name;

              // Clean up platform suffixes from artist names
              artist = artist
                .replace(/\s+via\s+Wavlake$/i, '')
                .replace(/\s+via\s+\w+$/i, '') // Remove any "via [Platform]"
                .replace(/\s+on\s+\w+$/i, '') // Remove any "on [Platform]"
                .trim();
            }
            if (tlvObj && typeof tlvObj.feedID === 'number') {
              feedID = tlvObj.feedID;
            }
            if (tlvObj && typeof tlvObj.remote_feed_guid === 'string') {
              remote_feed_guid = tlvObj.remote_feed_guid;
            }
          } catch (e) {
            logger.error('Failed to parse tlv JSON', { tlv: event.tlv, error: e.message });
          }
        }
        
        // Handle different time formats (time vs ts)
        const timestamp = event.time 
          ? new Date(event.time * 1000).toISOString()
          : event.ts 
          ? new Date(Date.now()).toISOString()  // ts is position in track, not timestamp
          : new Date().toISOString();
        
        // Handle different value formats (value_msat vs value_msat_total)
        const valueMsat = event.value_msat || event.value_msat_total || 0;
        
        // Final check: Make sure artist is set correctly
        if (!artist && event.name) {
          // Try to extract from name field again
          if (event.name.includes('@')) {
            const username = event.name.split('@')[0];
            artist = username
              .replace(/([A-Z])/g, ' $1')
              .replace(/[_-]/g, ' ')
              .trim()
              .split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
              .join(' ');
          } else {
            artist = event.name.split(' via ')[0].trim();
          }
          console.log('⚠️ Artist was not set, extracted from name field:', artist);
        }
        
        // CRITICAL: Never use app_name as artist
        if (artist === event.app_name) {
          console.log('❌ ERROR: Artist was set to app_name, clearing it');
          artist = undefined;
        }
        
        // Log what we're about to send
        console.log('📤 Sending to music bot:', {
          artist: artist || 'UNDEFINED',
          remote_podcast: albumOrShow || artist,
          remote_episode: songTitle || 'Unknown Track',
          app: event.app_name || event.app,
          originalName: event.name,
          extractedArtist: artist,
          willUseAsArtist: artist
        });
        
        await musicShowBot.processMusicShowEvent({
          timestamp,
          podcast: event.podcast,
          episode: event.episode,
          remote_podcast: albumOrShow || artist,  // Use artist as fallback
          remote_episode: songTitle || 'Unknown Track',
          action: typeof event.action === 'string' 
            ? (event.action === 'stream' ? 1 : 2)  // Convert string action to number
            : (event.action || 1),
          value_sat: Math.floor(valueMsat / 1000),
          sender: event.sender || event.sender_name,
          message: event.message,
          app: event.app_name || event.app,
          artist,  // This should contain the actual artist name
          feedID,
          remote_feed_guid
        });
      } catch (error) {
        logger.error('Error processing music show event:', error);
      }
    }
    
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

// Test artist extraction directly
app.get('/test-artist', async (req, res) => {
  try {
    const testName = "Nate Johnivan via Wavlake";
    console.log('🧪 Testing artist extraction for:', testName);
    
    let artist;
    if (testName.includes('@')) {
      const username = testName.split('@')[0];
      artist = username
        .replace(/([A-Z])/g, ' $1')
        .replace(/[_-]/g, ' ')
        .trim()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
      console.log('🎵 Extracted artist from identifier:', testName, '->', artist);
    } else if (!testName.includes('via')) {
      artist = testName;
      console.log('🎵 Found artist in name field:', artist);
    } else {
      artist = testName.split(' via ')[0].trim();
      console.log('🎵 Extracted artist before "via":', artist);
    }
    
    res.json({ testName, extractedArtist: artist });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Test music show endpoint
app.get('/test-music-show', async (req, res) => {
  try {
    logger.info('Test music show requested');
    // Simulate the "No Way Back" webhook that shows Unknown Artist
    const testEvent = {
      action: "stream",
      boost_link: "https://app.podcastguru.io/podcast/X68747470733a2f2f697473616d6f6f642e6f72672f697473616d6f6f647273732e786d6c/episode/4482e38af39fe0840715aa726a9db9dc?t=434",
      guid: "469b403f-db2d-574c-9db9-96dbb3f6561c",
      episode_guid: "933784bc-1711-4f69-a228-20370812ecaf",
      remote_feed_guid: "0bc8103c-7e22-5a59-b152-04af80746b49",
      episode: "Cycles",
      speed: "2",
      app_version: "1.0.34 (119)",
      podcast: "It's A Mood",
      ts: 434,
      app_name: "PodcastGuru",
      remote_item_guid: "b93c4a1f-5c84-482c-9ac3-b841405c20b0",
      sender_name: "ChadF",
      value_msat: 13000,
      url: "https://itsamood.org/itsamoodrss.xml",
      sender_id: "791B666C-3FF7-4EE5-BD06-223BE1CF9F99",
      value_msat_total: 18000,
      name: "Middle Season",
      uuid: "F50AEBB3-D761-4708-BE5E-CC21F9227D03"
    };
    
    // Process through the webhook handler by making a local request
    console.log('🎵 Test webhook data:', JSON.stringify(testEvent, null, 2));
    
    // Make a request to our own webhook endpoint
    const webhookResponse = await fetch(`http://localhost:${PORT}/helipad-webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testEvent)
    });
    
    if (webhookResponse.ok) {
      res.status(200).send('Test music show event processed');
    } else {
      res.status(500).send('Failed to process test event');
    }
  } catch (err) {
    logger.error('Error processing test music show', { error: err.message, stack: err.stack });
    res.status(500).send('Error processing test music show');
  }
});

// Bot management endpoints
app.post('/manage/:action', async (req, res) => {
  const { action } = req.params;
  logger.info(`Management action requested: ${action}`);
  
  try {
    let result;
    const workingDir = process.cwd(); // Get current working directory
    
    // Helper function to execute commands with timeout
    const execWithTimeout = (command, timeoutMs = 10000) => {
      try {
        const result = execSync(command, { 
          cwd: workingDir, 
          encoding: 'utf8',
          timeout: timeoutMs 
        });
        return { stdout: result, stderr: '' };
      } catch (error) {
        return { 
          stdout: '', 
          stderr: error.message || 'Command failed' 
        };
      }
    };
    
    switch (action) {
      case 'status':
        result = execWithTimeout('npm run status', 10000);
        break;
        
      case 'restart':
        result = await execWithTimeout('npm run restart', 15000);
        break;
        
      case 'stop':
        result = execWithTimeout('npm run stop', 10000);
        break;
        
      case 'logs':
        // Try multiple log locations
        try {
          result = await execWithTimeout('tail -n 50 logs/helipad-webhook.log', 5000);
        } catch (logError) {
          try {
            result = await execWithTimeout('tail -n 50 logs/launch-agent.log', 5000);
          } catch (launchError) {
            result = { stdout: 'No log files found in logs/ directory', stderr: '' };
          }
        }
        break;
        
      case 'service-status':
        result = execWithTimeout('npm run service-status', 10000);
        break;
        
      case 'health':
        result = execWithTimeout('npm run health', 5000);
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

const PORT = process.env.PORT || 4444;
const SERVER_IP = process.env.SERVER_IP || '192.168.0.243';
app.listen(PORT, () => {
  logger.info(`Helipad webhook receiver started`, { port: PORT });
  logger.info(`Webhook URL: http://${SERVER_IP}:${PORT}/helipad-webhook`);
  logger.info(`Health check: http://${SERVER_IP}:${PORT}/health`);
  logger.info(`Management UI: http://${SERVER_IP}:${PORT}/`);
  
  // Start periodic monitoring
  startPeriodicMonitoring();
}); 