FROM node:20-slim
WORKDIR /app
COPY package.json package-lock.json* ./
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    fontconfig \
    fonts-dejavu \
    fonts-liberation \
    && npm ci --omit=dev --ignore-scripts=false \
    && apt-get purge -y --auto-remove python3 make g++ \
    && rm -rf /var/lib/apt/lists/* \
    && rm -rf /root/.npm
RUN fc-cache -fv
COPY . .
CMD ["node", "polaris.js"]