FROM node:24-alpine AS builder

# Install dependencies needed for native modules and enable pnpm
# hadolint ignore=DL3018
RUN apk add --no-cache python3 make g++ chromium && \
    corepack enable

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install all dependencies (needed for building)
RUN pnpm install --frozen-lockfile

# Copy source code and build
COPY tsconfig.json ./
COPY src/ ./src/
RUN pnpm run build

# Production stage
FROM node:24-alpine AS production

# Install chromium and enable pnpm
# hadolint ignore=DL3018
RUN apk add --no-cache chromium && \
    corepack enable

# ✅ Configurar Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    NODE_ENV=production

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S pdfbot -u 1001

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install only production dependencies
RUN pnpm install --frozen-lockfile --prod && \
    pnpm store prune

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Change ownership to non-root user
RUN chown -R pdfbot:nodejs /app
USER pdfbot

ENTRYPOINT ["pnpm", "start"]
