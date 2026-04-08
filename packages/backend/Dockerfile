FROM node:18-alpine

WORKDIR /app

# Install dependencies - handle both dev and prod
COPY package*.json ./
RUN npm ci --only=production || npm install

# Copy built code
COPY dist/ ./dist/

# Expose port
EXPOSE 6005

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:6005/health || exit 1

# Run
CMD ["node", "dist/index.js"]
