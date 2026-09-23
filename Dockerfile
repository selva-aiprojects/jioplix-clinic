# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Copy root workspace manifests
COPY package.json package-lock.json ./

# Copy all package manifests (needed for workspace dep resolution)
COPY packages/contracts/package.json      ./packages/contracts/
COPY packages/db/package.json             ./packages/db/
COPY packages/cybelinx-core/package.json  ./packages/cybelinx-core/
COPY packages/cybelinx-language/package.json ./packages/cybelinx-language/
COPY packages/cybelinx-sdk/package.json   ./packages/cybelinx-sdk/
COPY packages/cybelinx-ui/package.json    ./packages/cybelinx-ui/
COPY apps/api/package.json                ./apps/api/
COPY apps/web/package.json                ./apps/web/

# Install all workspace deps
RUN npm ci --ignore-scripts

# Copy all source (contracts resolved directly from src, db compiled to dist)
COPY packages/contracts/   ./packages/contracts/
COPY packages/db/          ./packages/db/
COPY packages/cybelinx-core/src/          ./packages/cybelinx-core/src/
COPY packages/cybelinx-core/tsconfig.json ./packages/cybelinx-core/
COPY packages/cybelinx-language/src/          ./packages/cybelinx-language/src/
COPY packages/cybelinx-language/tsconfig.json ./packages/cybelinx-language/
COPY packages/cybelinx-sdk/src/          ./packages/cybelinx-sdk/src/
COPY packages/cybelinx-sdk/tsconfig.json ./packages/cybelinx-sdk/

# Copy API source
COPY apps/api/src/          ./apps/api/src/
COPY apps/api/tsconfig.json ./apps/api/

# Build: db (compiles to dist), then API (compiles to apps/api/dist)
RUN npm run build -w @jioplix/db
RUN npm run build -w @jioplix/api

# ─── Stage 2: Lean production image ───────────────────────────────────────────
FROM node:22-alpine AS runner

ENV NODE_OPTIONS="--max-old-space-size=384"
ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app

# Copy workspace manifests for prod install
COPY package.json package-lock.json ./
COPY packages/contracts/package.json      ./packages/contracts/
COPY packages/db/package.json             ./packages/db/
COPY packages/cybelinx-core/package.json  ./packages/cybelinx-core/
COPY packages/cybelinx-language/package.json ./packages/cybelinx-language/
COPY packages/cybelinx-sdk/package.json   ./packages/cybelinx-sdk/
COPY packages/cybelinx-ui/package.json    ./packages/cybelinx-ui/
COPY apps/api/package.json                ./apps/api/
COPY apps/web/package.json                ./apps/web/

# Install production deps only
RUN npm ci --omit=dev --ignore-scripts

# contracts resolves from src directly (no build step)
COPY --from=builder /app/packages/contracts/src   ./packages/contracts/src

# db resolves from dist
COPY --from=builder /app/packages/db/dist         ./packages/db/dist
COPY --from=builder /app/packages/db/src          ./packages/db/src

# cybelinx packages resolve from src directly
COPY --from=builder /app/packages/cybelinx-core/src     ./packages/cybelinx-core/src
COPY --from=builder /app/packages/cybelinx-language/src  ./packages/cybelinx-language/src
COPY --from=builder /app/packages/cybelinx-sdk/src      ./packages/cybelinx-sdk/src

# API compiled output
COPY --from=builder /app/apps/api/dist   ./apps/api/dist

# Non-root user for security
RUN addgroup -S jioplix && adduser -S jioplix -G jioplix
USER jioplix

EXPOSE 3000

CMD ["node", "apps/api/dist/main.js"]
