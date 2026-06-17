FROM node:20-slim
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install -g npm@11.17.0
RUN npm install
COPY . .
CMD ["node", "polaris.js"]