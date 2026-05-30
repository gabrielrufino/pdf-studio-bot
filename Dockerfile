FROM node:24-alpine AS builder

# Install dependencies needed for native modules and enable pnpm
# hadolint ignore=DL3018
RUN apk add --no-cache python3 make g++ chromium && \
    corepack enable

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install all dependencies (needed for building)
RUN pnpm install --frozen-lockfile

# Copy source code and build
COPY tsconfig.json ./
COPY src/ ./src/
RUN pnpm run build && pnpm prune --prod

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

# Copy package files and pre-built node_modules from builder.
# We reuse the builder's node_modules to avoid recompiling native addons
# (e.g. muhammara) in an environment without build tools (python3/make/g++).
COPY package.json pnpm-lock.yaml ./
COPY --from=builder /app/node_modules ./node_modules

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Change ownership to non-root user
RUN chown -R pdfbot:nodejs /app
USER pdfbot

ENTRYPOINT ["pnpm", "start"]
