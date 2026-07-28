FROM node:18-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG DOMAIN_API=http://vehicle-api:3002
ARG VOICE_AGENT_URL
ENV DOMAIN_API=$DOMAIN_API
ENV VOICE_AGENT_URL=$VOICE_AGENT_URL
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3003
CMD ["npx", "next", "start", "-p", "3003"]
