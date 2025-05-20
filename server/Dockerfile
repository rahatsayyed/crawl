FROM node:18

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Install dependencies for Puppeteer
RUN apt-get update && apt-get install -y \
  fonts-liberation \
  libappindicator3-1 \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libcups2 \
  libdbus-1-3 \
  libdrm2 \
  libgbm1 \
  libnspr4 \
  libnss3 \
  libxcomposite1 \
  libxdamage1 \
  libxrandr2 \
  xdg-utils \
  && rm -rf /var/lib/apt/lists/*

# Install Chrome using Puppeteer's install script
RUN npx puppeteer browsers install chrome

ENV PUPPETEER_EXECUTABLE_PATH=/app/.cache/puppeteer/chrome/linux-<version>/chrome-linux/chrome
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

EXPOSE 3000
ENV PORT=3000
CMD ["npm", "start"]