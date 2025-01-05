FROM node:20 AS builder

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20

WORKDIR /app
COPY package.json package-lock.json ./
COPY --from=builder /app/dist ./dist
RUN npm ci --omit=dev
ENV NODE_ENV=production

CMD ["npm", "start"]
