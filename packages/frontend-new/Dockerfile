FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev for build)
RUN npm ci

# Copy source code
COPY src ./src
COPY public ./public 2>/dev/null || true
COPY next.config.mjs ./
COPY tsconfig.json ./
COPY postcss.config.mjs ./
COPY tailwind.config.ts ./
COPY components.json ./

# Build Next.js app
RUN npm run build

# Remove dev dependencies
RUN npm prune --only=production

EXPOSE 6205

ENV NODE_ENV=production
ENV PORT=6205

CMD ["npm", "start"]
