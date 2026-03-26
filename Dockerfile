FROM node:20-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY public ./public
COPY src ./src

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000
CMD ["npm", "install"]
CMD ["npm", "start"]

