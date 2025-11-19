# --- Build stage ---
FROM node:18-bullseye AS builder
WORKDIR /app

# Install deps
COPY package.json package-lock.json* ./
RUN npm ci || npm install

# Copy source
COPY . .

# Build Next.js (standalone)
ENV NODE_ENV=production
RUN npm run build

# --- Runtime stage ---
FROM node:18-bullseye AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy the standalone output and public assets
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Expose port
EXPOSE 3000

# Default envs (can be overridden by docker-compose)
ENV NEXT_PUBLIC_API_URL=http://localhost:8000/api \
    NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws

# Start Next.js standalone server
CMD ["node", "server.js"]
