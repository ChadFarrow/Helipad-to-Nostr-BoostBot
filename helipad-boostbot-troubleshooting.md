# Helipad-to-Nostr-BoostBot Troubleshooting Log

## Date: 2025-07-04

---

## Common Issues & Solutions

### 1. Port 3333 Already in Use (EADDRINUSE)
- **Symptom:** Error: listen EADDRINUSE: address already in use 0.0.0.0:3333
- **Solution:**
  1. Find the process using the port:
     ```sh
     lsof -i :3333
     ```
  2. Kill the process:
     ```sh
     kill <PID>
     # or force kill
     kill -9 <PID>
     ```
  3. If stuck, run:
     ```sh
     killall -9 node
     ```
  4. If still stuck, reboot your Mac.

---

### 2. Health Endpoint Not Loading
- **Symptom:** `curl http://localhost:3333/health` or `curl http://192.168.0.238:3333/health` fails.
- **Solution:**
  - Ensure BoostBot is running: `npm start`
  - Check for errors in the terminal or logs.
  - Make sure only one instance is running.
  - Test immediately after starting the bot.

---

### 3. Webhook Not Posting to Nostr
- **Symptom:** BoostBot receives webhooks but does not post to Nostr.
- **Solution:**
  - Ensure `.env` file exists and contains:
    ```
    NOSTR_BOOST_BOT_NSEC=your_nsec_key_here
    ```
  - Make sure `TEST_MODE` is not set to `true`.
  - Restart the bot after editing `.env`.
  - Check logs for Nostr-related errors.

---

### 4. Helipad Cannot Reach Webhook
- **Symptom:** Helipad shows errors or does not update.
- **Solution:**
  - Confirm both devices are on the same network.
  - Test from Helipad device:
    ```sh
    curl http://192.168.0.238:3333/health
    ```
  - Check firewall settings (should be off or allow port 3333).
  - Use correct webhook URL in Helipad:
    ```
    http://192.168.0.238:3333/helipad-webhook
    ```

---

### 5. Process Manager/Auto-Restart Loops
- **Symptom:** Multiple "Helipad webhook receiver started" log entries, port flapping.
- **Solution:**
  - Stop all auto-restart scripts (e.g., `auto-restart.js`, `monitor-boostbot.command`).
  - Run the bot manually in the foreground for debugging.

---

## Useful Commands

- Check port usage:
  ```sh
  lsof -i :3333
  ```
- Kill a process:
  ```sh
  kill <PID>
  kill -9 <PID>
  ```
- Kill all node processes:
  ```sh
  killall -9 node
  ```
- Start BoostBot:
  ```sh
  npm start
  ```
- Check health endpoint:
  ```sh
  curl http://localhost:3333/health
  curl http://192.168.0.238:3333/health
  ```
- Check logs:
  ```sh
  tail -n 40 boostbot.log
  tail -n 40 logs/helipad-webhook.log
  ```

---

## Environment Variables
- `.env` file should include:
  ```
  NOSTR_BOOST_BOT_NSEC=your_nsec_key_here
  # TEST_MODE=false
  ```

---

## General Tips
- Always check for port conflicts before starting the bot.
- Only one instance of BoostBot should run at a time.
- Restart the bot after any config or environment change.
- Keep this file updated with new troubleshooting steps as you learn more.

---

**This file is safe to keep in your project directory for future reference.** 