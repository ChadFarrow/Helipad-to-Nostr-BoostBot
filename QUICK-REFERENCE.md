# 🚀 BoostBot Quick Reference

## 📱 **One-Command Status Check**
```bash
npm run dashboard
```

## 🔍 **Status & Health**
```bash
npm run status      # Detailed status
npm run health      # Quick health check
npm run logs        # View logs
```

## ⚡ **Bot Management**
```bash
npm start           # Start bot
npm run stop        # Stop bot
npm run restart     # Restart bot
npm run dev         # Development mode (auto-restart on changes)
```

## 🛡️ **Auto-Restart (Production)**
```bash
npm run auto-restart
```
*Run this in a separate terminal to keep bot running automatically*

## 👀 **Continuous Monitoring**
```bash
npm run watch       # Updates every 30 seconds
npm run monitor     # One-time check
```

## 🧪 **Test Endpoints**
```bash
curl http://localhost:3001/health
curl http://localhost:3001/test-daily-summary
curl http://localhost:3001/test-weekly-summary
```

## ✅ **Good Status Indicators**
- Dashboard shows "✅ RUNNING"
- Health check returns "Webhook receiver is running"
- Process count: 1-2 processes
- Port 3001: ✅ IN USE

## ❌ **Warning Signs**
- Dashboard shows "❌ STOPPED"
- Health check fails
- No processes found
- Port 3001: ❌ NOT IN USE

## 🚨 **Emergency Commands**
```bash
npm run stop        # Kill all bot processes
npm run restart     # Fresh restart
npm run auto-restart # Auto-recovery
```

## 📍 **Webhook URL**
```
http://localhost:3001/helipad-webhook
```

---
*Save this file for quick access!* 