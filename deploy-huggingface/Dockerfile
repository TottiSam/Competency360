# Competency360 container build for Hugging Face Spaces (Docker SDK).
# It also works unchanged on any other Docker host (Render, Fly.io, Railway, a VPS).
FROM node:22-bookworm-slim

# Prisma needs OpenSSL at build time and at run time.
RUN apt-get update -y \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# Hugging Face runs Spaces as UID 1000, which is the built-in "node" user in this image.
# Create the app folder as root and hand it to that user so the build can write to it.
RUN mkdir -p /home/node/app && chown -R node:node /home/node
USER node
WORKDIR /home/node/app

ENV NEXT_TELEMETRY_DISABLED=1 \
    CHECKPOINT_DISABLE=1 \
    PRISMA_HIDE_UPDATE_MESSAGE=1 \
    DATABASE_URL="file:/home/node/app/prisma/dev.db"

# Install dependencies first so Docker can reuse this layer on rebuilds.
COPY --chown=node:node package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY --chown=node:node . .

# lib/auth.ts throws at import time in production when JWT_SECRET is missing, and "next build"
# imports it. This value is used for this one build command only and is not used at run time.
# The real secret is read (or generated) when the container starts, see start.mjs.
RUN JWT_SECRET=build-time-placeholder-not-used-at-runtime npm run build

# Create the SQLite file and load the demo data into the image.
RUN npx prisma db push --skip-generate && npx tsx prisma/seed.ts

ENV NODE_ENV=production \
    PORT=7860
EXPOSE 7860
CMD ["node", "start.mjs"]
