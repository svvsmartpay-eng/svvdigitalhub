# Production Dockerfile for SVV AMS API & WhatsApp Baileys Gateway Node
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++ git

# Copy root configs
COPY package*.json ./
COPY tsconfig*.json ./
COPY apps/api/package*.json ./apps/api/
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY apps/api/ ./apps/api/

# Build TypeScript
RUN npm --prefix apps/api run build

# Production runtime stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

RUN apk add --no-cache ffmpeg

# Copy built artifacts & dependencies
COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package*.json ./apps/api/

# Create persistent uploads and sessions directories
RUN mkdir -p /app/apps/api/uploads/whatsapp /app/apps/api/sessions

EXPOSE 4000

CMD ["node", "apps/api/dist/app.js"]
