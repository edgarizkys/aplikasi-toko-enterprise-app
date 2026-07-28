I'll generate a production-ready Dockerfile for the Aplikasi Toko Enterprise application.

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production && \
    npm cache clean --force

COPY . .

RUN npm run build

FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN apk add --no-cache \
    dumb-init \
    curl

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

EXPOSE 3000

USER node

ENTRYPOINT ["/usr/sbin/dumb-init", "--"]
CMD ["/docker-entrypoint.sh"]
```

Save this as `Dockerfile` in your project root.