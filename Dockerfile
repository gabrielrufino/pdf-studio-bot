FROM node:22-alpine AS base

# Install dependencies needed for native modules
RUN apk add --no-cache python3 make g++

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S pdfbot -u 1001

WORKDIR /app

# Copy package files for dependency installation
COPY package.json package-lock.json ./

# Development stage
FROM base AS development

# Install all dependencies (including devDependencies)
RUN npm ci --frozen-lockfile

# Copy source code and config files
COPY tsconfig.json ./
COPY src/ ./src/

# Change ownership to non-root user
RUN chown -R pdfbot:nodejs /app
USER pdfbot

# Set development environment
ENV NODE_ENV=development

# Use tsx for development with hot-reload
CMD ["npm", "run", "start:dev"]

# Builder stage
FROM base AS builder

# Install all dependencies (including devDependencies for build)
RUN npm ci --frozen-lockfile

# Copy source code and config files
COPY tsconfig.json ./
COPY src/ ./src/

# Build the application
RUN npx tsc

# Production stage
FROM base AS production

# Set production environment
ENV NODE_ENV=production

# Install only production dependencies
RUN npm ci --frozen-lockfile --omit=dev && \
    npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Change ownership to non-root user
RUN chown -R pdfbot:nodejs /app
USER pdfbot

# Expose port if needed (adjust based on your app)
# EXPOSE 3000

# Health check (optional - adjust based on your app)
# HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
#   CMD node dist/health.js || exit 1

ENTRYPOINT ["npm", "start"]
