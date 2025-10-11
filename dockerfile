# ===============================
# 1️⃣ Build stage: Compile the application
# ===============================
FROM node:22-alpine AS builder

WORKDIR /app

# Install git to clone the repository
RUN apk add --no-cache git
RUN git clone --depth=1 https://github.com/MrMinemeet/jsflare.git .

RUN npm install
RUN npm run build

# ===============================
# 2️⃣ Runtime stage: Create the final, minimal image
# ===============================
FROM gcr.io/distroless/nodejs22-debian12

WORKDIR /app

# No node_modules or packagde.json is needed here, only the transpiled app
COPY --from=builder /app/dist ./dist

# Copy the entrypoint script
COPY docker-entrypoint.sh /entrypoint.sh

# Set the default environment variable
ENV JSFLARE_CONFIG=/config/config.jsonc

# Set the entrypoint for the container
ENTRYPOINT ["/entrypoint.sh"]