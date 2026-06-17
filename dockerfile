FROM node:20-slim
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm i
COPY . .
CMD ["node", "polaris.js"]