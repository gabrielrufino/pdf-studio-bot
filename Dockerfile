FROM node:20 AS builder

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20

WORKDIR /app
COPY package.json ./
COPY --from=builder /app/dist ./dist
ENV NODE_ENV=production

CMD ["npm", "start"]
