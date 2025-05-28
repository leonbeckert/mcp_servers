FROM node:22-alpine as builder

WORKDIR /app
COPY . .
RUN --mount=type=cache,target=/root/.npm npm ci
RUN npm run build

FROM node:22-alpine as run
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --omit=dev
ENV NODE_ENV=production

ENTRYPOINT ["node", "dist/index.js"]
