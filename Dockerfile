# Multi-stage Production Dockerfile for EasyPanel / Hostinger VPS
FROM node:20-alpine AS base

# Step 1: Install dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# Step 2: Build Application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npx prisma generate
RUN npm run build

# Step 3: Production Runner
FROM base AS runner
RUN apk add --no-cache openssl
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy full node_modules and package.json so we can run npx prisma db push at runtime
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

COPY --from=builder /app/public ./public
RUN mkdir .next

# Copy Standalone Bundle
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma

# We run as ROOT to ensure we have write permissions to the EasyPanel volume mount
# SQLite needs to create files and WAL logs in /app/data

EXPOSE 3000

CMD ["sh", "-c", "mkdir -p /app/data && npx prisma db push --accept-data-loss && node server.js"]
