ARG NODE_IMAGE=node:24.19.0-bookworm-slim@sha256:a9f5f7c91a432850b2a8a7797adf5eadb6c733ceed61167806cee7ea7fbc29df
FROM ${NODE_IMAGE} AS dependencies
WORKDIR /srv
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM ${NODE_IMAGE} AS runtime
WORKDIR /srv
ENV NODE_ENV=production PORT=5000
COPY --from=dependencies --chown=node:node /srv/node_modules ./node_modules
COPY --chown=node:node package.json package-lock.json app.js server.js ./
COPY --chown=node:node config ./config
COPY --chown=node:node db ./db
COPY --chown=node:node middleware ./middleware
COPY --chown=node:node models ./models
COPY --chown=node:node routes ./routes
COPY --chown=node:node services ./services
COPY --chown=node:node licenses ./licenses
COPY --chown=node:node scripts/migrate-relational.js ./scripts/migrate-relational.js
RUN mkdir -p /srv/data && chown node:node /srv/data
USER node
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD node -e "fetch('http://127.0.0.1:5000/ready',{signal:AbortSignal.timeout(3000)}).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["npm", "start"]
