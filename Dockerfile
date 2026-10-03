FROM node:20-alpine AS base
WORKDIR /app

# ── Build server ──
FROM base AS server-build
COPY server/package.json server/package-lock.json* ./server/
COPY package.json package-lock.json ./
RUN npm install --workspace=server --ignore-scripts
COPY server/ ./server/

# ── Build client ──
FROM base AS client-build
COPY client/package.json client/package-lock.json* ./client/
COPY package.json package-lock.json ./
RUN npm install --workspace=client --ignore-scripts
COPY client/ ./client/
RUN npm run build --workspace=client

# ── Production image ──
FROM base AS production

# Install server deps only
COPY package.json package-lock.json ./
COPY server/package.json ./server/
RUN npm install --workspace=server --ignore-scripts --omit=dev

# Copy server source
COPY server/ ./server/

# Copy built client into server/public
COPY --from=client-build /app/client/dist ./server/public

# Expose port
EXPOSE 3001

# Start server (serves API + static client)
CMD ["npx", "tsx", "server/src/index.ts"]
