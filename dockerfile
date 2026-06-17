FROM node:20-slim
WORKDIR /app
COPY package.json package-lock.json* ./
COPY . .
CMD ["node", "polaris.js"]