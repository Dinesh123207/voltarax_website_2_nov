ARG NODE_IMAGE=node:24.19.0-bookworm-slim@sha256:a9f5f7c91a432850b2a8a7797adf5eadb6c733ceed61167806cee7ea7fbc29df
FROM ${NODE_IMAGE} AS dependencies
WORKDIR /srv
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS builder
ARG BACKEND_URL=http://backend:5000
ARG SITE_URL=
ARG PUBLIC_INDEXING_ENABLED=false
ARG PUBLIC_CONTENT_REVIEWED=false
ARG NEXT_PUBLIC_CONTACT_EMAIL=
ARG NEXT_PUBLIC_CONTACT_PHONE=
ARG NEXT_PUBLIC_CONTACT_LOCATION=
ARG NEXT_PUBLIC_LINKEDIN_URL=
ARG NEXT_PUBLIC_X_URL=
ARG NEXT_PUBLIC_GITHUB_URL=
ARG NEXT_PUBLIC_BACKGROUND_VIDEO_ENABLED=false
ENV NEXT_TELEMETRY_DISABLED=1 NODE_OPTIONS=--max-old-space-size=768
COPY . .
RUN npm run build

FROM ${NODE_IMAGE} AS runtime
WORKDIR /srv
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
COPY --from=builder --chown=node:node /srv/.next/standalone ./
# postbuild staged public/static assets inside standalone before this copy.
COPY --from=builder --chown=node:node /srv/licenses ./licenses
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000/healthz',{signal:AbortSignal.timeout(3000)}).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
