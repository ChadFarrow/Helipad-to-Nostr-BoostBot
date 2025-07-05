// Simplified Helipad webhook for BoostBot Starter
import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { announceHelipadPayment } from './lib/nostr-bot.ts';
import { logger } from './lib/logger.js';

dotenv.config();

const app = express();
app.use(bodyParser.json());

// Serve static files from public directory
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
    logger.warn('Missing or invalid Authorization header');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.substring(7); // Remove 'Bearer '
  if (token !== AUTH_TOKEN) {
    logger.warn('Invalid token received');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Main webhook endpoint
app.post('/helipad-webhook', authenticate, async (req, res) => {
  try {
    const event = req.body;
    logger.info('Received Helipad webhook', { event });
    
    const satsAmount = Math.floor(event.value_msat_total / 1000);
    const actionName = {
      0: 'Error',
      1: 'Stream',
      2: 'Boost',
      3: 'Unknown',
      4: 'Auto Boost'
    }[event.action] || 'Unknown';
    
    logger.info(`💰 ${actionName}: ${satsAmount} sats from ${event.sender || 'Unknown'} → ${event.podcast || 'Unknown'}`);
    
    // Only post boosts (action === 2) to Nostr
    if (event.action === 2 && satsAmount > 0) {
      try {
        await announceHelipadPayment(event);
      } catch (nostrError) {
        logger.error('Error posting to Nostr:', nostrError);
        // Don't fail the webhook if Nostr posting fails
      }
    }
    
    res.json({ success: true, message: 'Webhook processed successfully' });
  } catch (error) {
    logger.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Simple status endpoint
app.get('/status', (req, res) => {
  res.json({
    status: 'running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0'
  });
});

// Root endpoint with basic info
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>BoostBot Starter</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .status { padding: 10px; border-radius: 5px; margin: 10px 0; }
        .ok { background-color: #d4edda; color: #155724; }
        .info { background-color: #d1ecf1; color: #0c5460; }
      </style>
    </head>
    <body>
      <h1>🚀 BoostBot Starter</h1>
      <div class="status ok">✅ Bot is running</div>
      <div class="status info">
        <strong>Webhook URL:</strong> POST /helipad-webhook<br>
        <strong>Health Check:</strong> GET /health<br>
        <strong>Status:</strong> GET /status
      </div>
      <p>This is a simplified version of BoostBot for new users. It posts boosts to Nostr without custom features.</p>
    </body>
    </html>
  `);
});

const PORT = process.env.PORT || 3333;

app.listen(PORT, () => {
  logger.info(`BoostBot Starter running on port ${PORT}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
  logger.info(`Webhook endpoint: http://localhost:${PORT}/helipad-webhook`);
}); 