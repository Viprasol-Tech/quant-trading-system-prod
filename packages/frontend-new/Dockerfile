FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy pre-built .next folder
COPY .next ./.next

# Copy public assets
COPY public ./public 2>/dev/null || true

EXPOSE 6205

ENV NODE_ENV=production
ENV PORT=6205

CMD ["npm", "start"]
