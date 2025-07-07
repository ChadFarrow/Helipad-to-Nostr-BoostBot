# Production stage
FROM node:20-alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S boostbot -u 1001

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including devDependencies for tsx)
RUN npm ci && npm cache clean --force

# Copy application files
COPY . .

# Copy entrypoint script
COPY docker-entrypoint.sh /app/docker-entrypoint.sh

# Create data directory for persistent files
RUN mkdir -p /app/data && chown -R boostbot:nodejs /app/data /app/public

# Switch to non-root user
USER boostbot

# Environment variables
ARG PORT=3333
ENV PORT=${PORT}
ENV NODE_ENV=production
ENV DATA_DIR=/app/data

# Expose port
EXPOSE ${PORT}

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3333) + '/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Start the application with entrypoint script
CMD ["/app/docker-entrypoint.sh"] 