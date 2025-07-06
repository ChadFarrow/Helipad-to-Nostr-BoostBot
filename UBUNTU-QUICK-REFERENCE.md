# BoostBot Ubuntu Quick Reference

## 🚀 Quick Start Commands

### PM2 Management (Recommended)
```bash
# Start bot
pm2 start ecosystem.config.js

# Check status
pm2 status

# View logs
pm2 logs boostbot

# Restart bot
pm2 restart boostbot

# Stop bot
pm2 stop boostbot

# Monitor processes
pm2 monit

# Save PM2 config
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

### Systemd Management (Alternative)
```bash
# Start service
sudo systemctl start boostbot

# Check status
sudo systemctl status boostbot

# View logs
sudo journalctl -u boostbot -f

# Restart service
sudo systemctl restart boostbot

# Stop service
sudo systemctl stop boostbot

# Enable on boot
sudo systemctl enable boostbot

# Disable on boot
sudo systemctl disable boostbot
```

## 🔧 Service Management

### Nginx
```bash
# Check status
sudo systemctl status nginx

# Restart nginx
sudo systemctl restart nginx

# Test configuration
sudo nginx -t

# Reload configuration
sudo systemctl reload nginx
```

### Firewall
```bash
# Check status
sudo ufw status

# Allow port
sudo ufw allow 3001

# Deny port
sudo ufw deny 3001
```

## 📊 Monitoring

### System Resources
```bash
# CPU and memory usage
htop

# Disk usage
df -h

# Process list
ps aux | grep boostbot

# Network connections
netstat -tlnp | grep :3001
```

### Application Logs
```bash
# PM2 logs
pm2 logs boostbot

# Systemd logs
sudo journalctl -u boostbot -f

# Nginx logs
sudo tail -f /var/log/nginx/boostbot_access.log
sudo tail -f /var/log/nginx/boostbot_error.log

# Application logs
tail -f /opt/boostbot/logs/combined.log
```

## 🌐 Webhook Testing

### Health Check
```bash
# Local test
curl http://localhost:3001/health

# External test
curl http://your-server-ip:3001/health
```

### Webhook Test
```bash
# Test webhook endpoint
curl -X POST http://localhost:3001/helipad-webhook \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

## 🔒 Security

### SSL Setup (Let's Encrypt)
```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### File Permissions
```bash
# Fix ownership
sudo chown -R boostbot:boostbot /opt/boostbot

# Fix permissions
chmod 600 /opt/boostbot/.env
chmod 755 /opt/boostbot/scripts/*.js
```

## 🛠️ Troubleshooting

### Bot Won't Start
```bash
# Check if port is in use
sudo netstat -tlnp | grep :3001

# Kill process if needed
sudo kill -9 <PID>

# Check logs
pm2 logs boostbot
sudo journalctl -u boostbot -n 50
```

### Permission Issues
```bash
# Fix ownership
sudo chown -R $USER:$USER /opt/boostbot

# Fix permissions
chmod +x scripts/*.js
```

### Service Issues
```bash
# Reload systemd
sudo systemctl daemon-reload

# Reset failed services
sudo systemctl reset-failed

# Check service dependencies
sudo systemctl list-dependencies boostbot
```

## 📁 Important Files

### Configuration Files
- `/opt/boostbot/.env` - Environment variables
- `/opt/boostbot/ecosystem.config.js` - PM2 configuration
- `/etc/systemd/system/boostbot.service` - Systemd service
- `/etc/nginx/sites-available/boostbot` - Nginx configuration

### Log Files
- `/opt/boostbot/logs/` - Application logs
- `~/.pm2/logs/` - PM2 logs
- `/var/log/nginx/` - Nginx logs
- `/var/log/syslog` - System logs

### Backup Files
```bash
# Create backup
tar -czf boostbot-backup-$(date +%Y%m%d).tar.gz \
  /opt/boostbot/.env \
  /opt/boostbot/ecosystem.config.js \
  /etc/systemd/system/boostbot.service \
  /etc/nginx/sites-available/boostbot
```

## 🔄 Maintenance

### Regular Updates
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Update Node.js dependencies
cd /opt/boostbot
npm update

# Update PM2
sudo npm update -g pm2
```

### Log Rotation
```bash
# Create logrotate config
sudo nano /etc/logrotate.d/boostbot

# Add configuration:
/opt/boostbot/logs/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 644 boostbot boostbot
}
```

## 📞 Emergency Commands

### Force Stop Everything
```bash
# Stop PM2
pm2 kill

# Stop systemd service
sudo systemctl stop boostbot

# Kill all node processes
sudo pkill -f node

# Kill process on port 3001
sudo fuser -k 3001/tcp
```

### Emergency Restart
```bash
# Restart everything
sudo systemctl restart boostbot
sudo systemctl restart nginx
pm2 restart all
```

### Check All Services
```bash
# Check all related services
sudo systemctl status boostbot nginx
pm2 status
sudo ufw status
```

## 🎯 Performance Tuning

### Node.js Optimization
```bash
# Increase memory limit
node --max-old-space-size=2048 helipad-webhook.js

# Use production mode
export NODE_ENV=production
```

### PM2 Optimization
```bash
# Monitor memory usage
pm2 monit

# Set memory limit
pm2 start ecosystem.config.js --max-memory-restart 1G
```

### Nginx Optimization
```bash
# Enable gzip compression
sudo nano /etc/nginx/nginx.conf

# Add to http block:
gzip on;
gzip_types text/plain text/css application/json application/javascript;
``` 