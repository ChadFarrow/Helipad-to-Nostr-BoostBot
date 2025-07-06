# BoostBot Migration to Ubuntu Server

This guide will help you migrate your BoostBot from macOS to an Ubuntu server for 24/7 operation.

## Prerequisites

- Ubuntu server (20.04 LTS or newer recommended)
- SSH access to your server
- Node.js 18+ installed on the server
- Git installed on the server

## Step 1: Prepare Your Local Machine

### 1.1 Stop the Current Bot
```bash
# Stop the current bot if running
npm run stop

# Uninstall the macOS launch agent
npm run uninstall-service
```

### 1.2 Create Migration Package
```bash
# Create a migration archive (excluding node_modules and logs)
tar --exclude='node_modules' --exclude='logs' --exclude='.git' -czf boostbot-migration.tar.gz .
```

## Step 2: Set Up Ubuntu Server

### 2.1 Install Dependencies
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+ (using NodeSource repository)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Git
sudo apt install git -y

# Install PM2 for process management
sudo npm install -g pm2

# Install nginx (optional, for reverse proxy)
sudo apt install nginx -y
```

### 2.2 Create Application Directory
```bash
# Create directory for the bot
sudo mkdir -p /opt/boostbot
sudo chown $USER:$USER /opt/boostbot
cd /opt/boostbot
```

## Step 3: Transfer Files

### 3.1 Upload Migration Package
```bash
# From your local machine, upload the archive
scp boostbot-migration.tar.gz user@your-server-ip:/opt/boostbot/

# SSH into your server
ssh user@your-server-ip
```

### 3.2 Extract and Setup
```bash
cd /opt/boostbot
tar -xzf boostbot-migration.tar.gz

# Install dependencies
npm install

# Create necessary directories
mkdir -p logs
```

## Step 4: Configure Environment

### 4.1 Create Environment File
```bash
# Create .env file
nano .env
```

Add your configuration:
```env
NSEC=REPLACE_WITH_YOUR_ACTUAL_NOSTR_PRIVATE_KEY
HELIPAD_WEBHOOK_TOKEN=optional_auth_token
PORT=3001
NODE_ENV=production
```

### 4.2 Set Up PM2 Configuration
```bash
# Create PM2 ecosystem file
nano ecosystem.config.js
```

Add the PM2 configuration (see `ecosystem.config.js` file in this directory).

## Step 5: Set Up Systemd Service (Alternative to PM2)

### 5.1 Create Systemd Service File
```bash
sudo nano /etc/systemd/system/boostbot.service
```

Add the service configuration (see `boostbot.service` file in this directory).

### 5.2 Enable and Start Service
```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service to start on boot
sudo systemctl enable boostbot

# Start the service
sudo systemctl start boostbot

# Check status
sudo systemctl status boostbot
```

## Step 6: Configure Firewall

### 6.1 Open Required Ports
```bash
# Allow SSH (if not already allowed)
sudo ufw allow ssh

# Allow webhook port
sudo ufw allow 3001

# If using nginx reverse proxy
sudo ufw allow 80
sudo ufw allow 443

# Enable firewall
sudo ufw enable
```

## Step 7: Set Up Nginx Reverse Proxy (Optional)

### 7.1 Configure Nginx
```bash
sudo nano /etc/nginx/sites-available/boostbot
```

Add the nginx configuration (see `nginx-boostbot.conf` file in this directory).

### 7.2 Enable Site
```bash
# Create symlink
sudo ln -s /etc/nginx/sites-available/boostbot /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

## Step 8: Set Up SSL with Let's Encrypt (Optional)

### 8.1 Install Certbot
```bash
sudo apt install certbot python3-certbot-nginx -y
```

### 8.2 Obtain SSL Certificate
```bash
sudo certbot --nginx -d your-domain.com
```

## Step 9: Monitoring and Management

### 9.1 PM2 Management (if using PM2)
```bash
# Start the bot
pm2 start ecosystem.config.js

# Monitor processes
pm2 monit

# View logs
pm2 logs boostbot

# Restart bot
pm2 restart boostbot

# Stop bot
pm2 stop boostbot

# Save PM2 configuration
pm2 save

# Set up PM2 to start on boot
pm2 startup
```

### 9.2 Systemd Management (if using systemd)
```bash
# Check status
sudo systemctl status boostbot

# View logs
sudo journalctl -u boostbot -f

# Restart service
sudo systemctl restart boostbot

# Stop service
sudo systemctl stop boostbot
```

## Step 10: Update Webhook URL

Update your Helipad webhook URL to point to your server:
- **Direct**: `http://your-server-ip:3001/helipad-webhook`
- **With Nginx**: `https://your-domain.com/helipad-webhook`

## Step 11: Testing

### 11.1 Test Health Endpoint
```bash
# Test health endpoint
curl http://localhost:3001/health

# Test from external
curl http://your-server-ip:3001/health
```

### 11.2 Test Webhook
```bash
# Test webhook endpoint
curl -X POST http://localhost:3001/helipad-webhook \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

## Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Check what's using the port
   sudo netstat -tlnp | grep :3001
   
   # Kill process if needed
   sudo kill -9 <PID>
   ```

2. **Permission Issues**
   ```bash
   # Fix ownership
   sudo chown -R $USER:$USER /opt/boostbot
   
   # Fix permissions
   chmod +x scripts/*.js
   ```

3. **Service Won't Start**
   ```bash
   # Check systemd logs
   sudo journalctl -u boostbot -n 50
   
   # Check PM2 logs
   pm2 logs boostbot
   ```

4. **Firewall Issues**
   ```bash
   # Check firewall status
   sudo ufw status
   
   # Allow port if needed
   sudo ufw allow 3001
   ```

### Log Locations

- **PM2 logs**: `~/.pm2/logs/`
- **Systemd logs**: `sudo journalctl -u boostbot`
- **Application logs**: `/opt/boostbot/logs/`

## Maintenance

### Regular Tasks

1. **Update System**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Update Node.js Dependencies**
   ```bash
   cd /opt/boostbot
   npm update
   ```

3. **Rotate Logs**
   ```bash
   # Set up log rotation
   sudo nano /etc/logrotate.d/boostbot
   ```

4. **Backup Configuration**
   ```bash
   # Backup important files
   tar -czf boostbot-backup-$(date +%Y%m%d).tar.gz .env ecosystem.config.js
   ```

## Security Considerations

1. **Use Strong Passwords**
2. **Keep System Updated**
3. **Use SSH Keys Instead of Passwords**
4. **Configure Firewall Properly**
5. **Use SSL/TLS for Production**
6. **Regular Security Audits**

## Performance Optimization

1. **Monitor Resource Usage**
   ```bash
   # Monitor CPU and memory
   htop
   
   # Monitor disk usage
   df -h
   ```

2. **Optimize Node.js**
   ```bash
   # Use production mode
   export NODE_ENV=production
   
   # Increase memory limit if needed
   node --max-old-space-size=2048 helipad-webhook.js
   ```

## Support

If you encounter issues during migration:

1. Check the logs for error messages
2. Verify all dependencies are installed
3. Ensure proper permissions
4. Test connectivity and firewall rules
5. Review the troubleshooting section above

Your BoostBot should now be running 24/7 on your Ubuntu server! 🚀 