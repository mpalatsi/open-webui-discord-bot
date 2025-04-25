FROM node:18-alpine

# Create a non-root user to run the application
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy application files
COPY . .

# Create necessary directories with proper ownership
RUN mkdir -p logs && \
    mkdir -p node_modules/.cache && \
    chown -R appuser:appgroup /app

# Health check to ensure the bot is running
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:${PORT:-3001}/health || exit 1

# Switch to non-root user
USER appuser

# Start the bot
CMD [ "node", "src/index.js" ] 