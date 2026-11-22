# Single-container deployment: Express API + built React SPA on one port.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=5000
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/frontend/dist ./frontend/dist
COPY backend ./backend
RUN rm -rf backend/tests backend/vitest.config.ts
USER node
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD wget -qO- http://127.0.0.1:5000/health || exit 1
CMD ["npx", "tsx", "backend/index.ts"]
