FROM --platform=$BUILDPLATFORM node:20-bookworm-slim AS deps
WORKDIR /app/apps/web
COPY apps/web/package.json apps/web/package-lock.json ./
RUN npm ci

FROM --platform=$BUILDPLATFORM node:20-bookworm-slim AS builder
WORKDIR /app/apps/web
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/apps/web/node_modules ./node_modules
COPY apps/web ./
COPY db ./db
RUN npm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
RUN useradd --system --uid 1001 nextjs
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./.next/static
COPY --from=builder /app/apps/web/public ./public
COPY --from=builder /app/apps/web/db ./apps/web/db
COPY --from=builder /app/apps/web/migrate.js ./apps/web/migrate.js
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh
USER nextjs
EXPOSE 3000
CMD ["/app/entrypoint.sh"]
