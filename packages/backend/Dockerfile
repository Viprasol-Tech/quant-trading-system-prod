FROM node:18-alpine

WORKDIR /app

# Install build dependencies (Python required for better-sqlite3)
RUN apk add --no-cache python3 make g++ curl

# Install dependencies and build
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy source code
COPY src/ ./src/
COPY tsconfig.json ./

# Build TypeScript
RUN npm run build

# Remove dev dependencies for production
RUN npm prune --omit=dev --legacy-peer-deps

# Expose port
EXPOSE 6005

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:6005/health || exit 1

# Run
CMD ["node", "dist/index.js"]
