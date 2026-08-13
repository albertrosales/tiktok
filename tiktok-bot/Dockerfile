FROM node:20-slim

# Instala ffmpeg y python3/pip para poder instalar yt-dlp
RUN apt-get update && \
    apt-get install -y ffmpeg python3 python3-pip curl && \
    pip3 install --no-cache-dir --break-system-packages yt-dlp && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY . .

# Render inyecta la variable PORT automáticamente
EXPOSE 3000

CMD ["node", "index.js"]
