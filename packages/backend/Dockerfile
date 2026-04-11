FROM node:18-alpine

WORKDIR /app

# Install dependencies and build
COPY package*.json ./
RUN npm ci

# Copy source code
COPY src/ ./src/
COPY tsconfig.json ./

# Build TypeScript
RUN npm run build

# Remove dev dependencies for production
RUN npm ci --only=production

# Expose port
EXPOSE 6005

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:6005/health || exit 1

# Run
CMD ["node", "dist/index.js"]
