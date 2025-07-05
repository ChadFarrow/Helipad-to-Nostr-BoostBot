# 🐳 BoostBot Docker Setup

This guide explains how to run the Helipad BoostBot in a Docker container.

## Prerequisites

- Docker and Docker Compose installed
- Nostr private key (nsec) for the bot
- Helipad webhook token

## Quick Start

### 1. Set up Environment Variables

Copy the example environment file:
```bash
cp env.example .env
```

Edit `.env` with your actual values:
```bash
# Required: Your Nostr private key
NOSTR_BOOST_BOT_NSEC=npub1your_actual_nsec_here

# Required: Helipad webhook token
HELIPAD_WEBHOOK_TOKEN=your_webhook_token_here

# Optional: Test mode (set to true for testing)
TEST_MODE=false
```

### 2. Build and Run with Docker Compose

```bash
# Build and start the container
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the container
docker-compose down
```

### 3. Verify It's Working

```bash
# Check health endpoint
curl http://localhost:3333/health

# Check container status
docker-compose ps
```

## Manual Docker Commands

### Build the Image
```bash
docker build -t helipad-boostbot .
```

### Run the Container
```bash
docker run -d \
  --name boostbot \
  -p 3333:3333 \
  -e NOSTR_BOOST_BOT_NSEC=your_nsec_here \
  -e HELIPAD_WEBHOOK_TOKEN=your_token_here \
  -e TEST_MODE=false \
  -v $(pwd)/data:/app/data \
  helipad-boostbot
```

## Data Persistence

The container uses volume mounts to persist data:

- `./data:/app/data` - Persistent data storage
- `./logs:/app/logs` - Log files (optional)

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NOSTR_BOOST_BOT_NSEC` | Yes | Your Nostr private key |
| `HELIPAD_WEBHOOK_TOKEN` | Yes | Helipad webhook authentication token |
| `PORT` | No | Port to run on (default: 3333) |
| `TEST_MODE` | No | Set to `true` for testing (default: false) |
| `NODE_ENV` | No | Node environment (default: production) |

## Health Checks

The container includes health checks that verify the bot is responding:

```bash
# Check health status
docker inspect helipad-boostbot | grep Health -A 10
```

## Troubleshooting

### View Logs
```bash
# Docker Compose
docker-compose logs -f

# Manual Docker
docker logs -f boostbot
```

### Access Container Shell
```bash
docker exec -it helipad-boostbot sh
```

### Restart Container
```bash
# Docker Compose
docker-compose restart

# Manual Docker
docker restart boostbot
```

### Check Resource Usage
```bash
docker stats helipad-boostbot
```

## Production Deployment

For production deployment:

1. **Use a reverse proxy** (nginx, traefik) in front of the container
2. **Set up SSL/TLS** certificates
3. **Configure proper logging** with log rotation
4. **Set up monitoring** and alerting
5. **Use Docker secrets** for sensitive environment variables

### Example with Nginx Reverse Proxy

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  boostbot:
    build: .
    environment:
      - NOSTR_BOOST_BOT_NSEC=${NOSTR_BOOST_BOT_NSEC}
      - HELIPAD_WEBHOOK_TOKEN=${HELIPAD_WEBHOOK_TOKEN}
    volumes:
      - ./data:/app/data
    networks:
      - internal

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - boostbot
    networks:
      - internal
      - external

networks:
  internal:
    driver: bridge
  external:
    driver: bridge
```

## Security Considerations

- ✅ Container runs as non-root user
- ✅ Environment variables for sensitive data
- ✅ Health checks included
- ✅ Minimal attack surface with Alpine Linux
- ⚠️ Ensure `.env` file is not committed to version control
- ⚠️ Use Docker secrets in production for sensitive data 