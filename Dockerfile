# ===============================
# 1️⃣ Build stage: Compile the application
# ===============================
FROM node:26-alpine AS builder
WORKDIR /app

# Install pnpm globally
RUN npm install --global corepack@latest && \
	corepack enable && \
	corepack prepare pnpm@latest --activate

# Separate pnpm parts to improve caching and avoid cache invalidation when src changes
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy repo data over and build
COPY . .
RUN pnpm run build

# ===============================
# 2️⃣ Runtime stage
# ===============================
FROM gcr.io/distroless/nodejs26-debian13
WORKDIR /app

# Copy built files from builder
COPY --from=builder /app/dist ./dist

ENTRYPOINT ["/nodejs/bin/node", "/app/dist/index.js"]
CMD ["--config", "/config/config.jsonc"]
