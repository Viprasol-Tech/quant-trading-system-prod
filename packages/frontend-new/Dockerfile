FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev for build)
RUN npm install --legacy-peer-deps

# Copy source code
COPY tsconfig.json ./
COPY src ./src
COPY public ./public
COPY next.config.mjs ./
COPY tailwind.config.ts ./
COPY postcss.config.mjs ./

# Build the application
RUN npm run build

# Remove dev dependencies
RUN npm prune --omit=dev --legacy-peer-deps

EXPOSE 6205

ENV NODE_ENV=production
ENV PORT=6205

CMD ["npm", "start"]
