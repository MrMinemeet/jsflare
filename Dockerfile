# ===============================
# 1️⃣ Build stage: Install pnpm for dependency installation
# ===============================
FROM node:26-alpine AS builder
WORKDIR /app

# Install pnpm globally
RUN npm install --global corepack@latest && \
	corepack enable && \
	corepack prepare pnpm@latest --activate

# Separate pnpm parts to improve caching and avoid cache invalidation when src changes
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

# ===============================
# 2️⃣ Runtime stage
# ===============================
FROM gcr.io/distroless/nodejs26-debian13
WORKDIR /app

# Copy basic package information
COPY LICENSE package.json ./

# Copy code from local to image (no transpilation needed thanks to native TS support)
COPY ./src ./src

# Copy runtime dependencies from builder
COPY --from=builder /app/node_modules ./node_modules

ENTRYPOINT ["/nodejs/bin/node", "/app/src/index.ts"]
CMD ["--config", "/config/config.jsonc"]
