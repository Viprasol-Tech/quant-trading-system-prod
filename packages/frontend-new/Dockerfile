FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm install --legacy-peer-deps && npm prune --omit=dev --legacy-peer-deps

# Copy pre-built .next folder
COPY .next ./.next

EXPOSE 6205

ENV NODE_ENV=production
ENV PORT=6205

CMD ["npm", "start"]
