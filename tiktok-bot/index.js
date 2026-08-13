// Bot de Telegram para descargar videos de TikTok en buena calidad
// Requiere: node-telegram-bot-api, yt-dlp instalado en el sistema (o vía pip)

const TelegramBot = require('node-telegram-bot-api');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const PORT = process.env.PORT || 3000;
// URL pública que Render te asigna, ej: https://tiktok-bot.onrender.com
const RENDER_URL = process.env.RENDER_EXTERNAL_URL;

if (!TOKEN) {
  console.error('❌ Falta la variable de entorno TELEGRAM_BOT_TOKEN.');
  console.error('   Configúrala en el panel de Render (Environment).');
  process.exit(1);
}

if (!RENDER_URL) {
  console.error('❌ Falta RENDER_EXTERNAL_URL. Render la define automáticamente en producción.');
  process.exit(1);
}

// Modo webhook: usamos Express como único servidor HTTP (sin que la librería abra el suyo)
const bot = new TelegramBot(TOKEN);
const webhookPath = `/bot${TOKEN}`;
bot.setWebHook(`${RENDER_URL}${webhookPath}`);

const app = express();
app.use(express.json());

app.post(webhookPath, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Ruta simple para verificar que el servicio está vivo
app.get('/', (req, res) => res.send('🤖 Bot de TikTok activo.'));

app.listen(PORT, () => console.log(`🌐 Servidor HTTP escuchando en el puerto ${PORT}`));

const DOWNLOAD_DIR = path.join(__dirname, 'downloads');

if (!fs.existsSync(DOWNLOAD_DIR)) {
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
}

// Detecta si el mensaje contiene un enlace de TikTok
function extractTikTokUrl(text) {
  if (!text) return null;
  const regex = /(https?:\/\/(?:www\.|vm\.|vt\.|m\.)?tiktok\.com\/[^\s]+)/i;
  const match = text.match(regex);
  return match ? match[0] : null;
}

// Obtiene el título/descripción del video de TikTok (metadatos, sin descargar el archivo)
function getTikTokTitle(url) {
  return new Promise((resolve) => {
    const proc = spawn('yt-dlp', [url, '--print', '%(title)s', '--no-warnings', '--no-playlist']);

    let stdout = '';
    proc.stdout.on('data', (data) => { stdout += data.toString(); });

    proc.on('close', () => {
      const title = stdout.trim();
      resolve(title || null);
    });

    proc.on('error', () => resolve(null));
  });
}

// Descarga el video usando yt-dlp, priorizando la mejor calidad disponible sin marca de agua
function downloadTikTok(url, outputTemplate) {
  return new Promise((resolve, reject) => {
    const args = [
      url,
      '-f', 'bestvideo+bestaudio/best', // mejor calidad de video + audio
      '--merge-output-format', 'mp4',
      '-o', outputTemplate,
      '--no-playlist',
      '--no-warnings',
    ];

    const proc = spawn('yt-dlp', args);

    let stderr = '';
    proc.stderr.on('data', (data) => { stderr += data.toString(); });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(stderr || `yt-dlp terminó con código ${code}`));
      }
    });

    proc.on('error', (err) => reject(err));
  });
}

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    '👋 Envíame un enlace de TikTok y te devuelvo el video en la mejor calidad disponible, sin marca de agua.'
  );
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const url = extractTikTokUrl(msg.text);

  if (!url) {
    if (msg.text && !msg.text.startsWith('/')) {
      bot.sendMessage(chatId, '⚠️ No detecté un enlace válido de TikTok. Envía el link directamente.');
    }
    return;
  }

  const statusMsg = await bot.sendMessage(chatId, '⏳ Descargando video, un momento...');

  const id = crypto.randomBytes(6).toString('hex');
  const outputTemplate = path.join(DOWNLOAD_DIR, `${id}.%(ext)s`);

  try {
    const [, title] = await Promise.all([
      downloadTikTok(url, outputTemplate),
      getTikTokTitle(url),
    ]);

    // Buscar el archivo generado (yt-dlp resuelve la extensión real)
    const files = fs.readdirSync(DOWNLOAD_DIR).filter((f) => f.startsWith(id));
    if (files.length === 0) throw new Error('No se generó el archivo de video.');

    const filePath = path.join(DOWNLOAD_DIR, files[0]);
    const stats = fs.statSync(filePath);

    // Telegram limita el caption a 1024 caracteres
    const caption = title ? title.slice(0, 1024) : undefined;

    // Telegram limita el envío de video vía bot API a 50MB
    if (stats.size > 50 * 1024 * 1024) {
      await bot.editMessageText(
        '⚠️ El video pesa más de 50MB, que es el límite de Telegram para bots. No se puede enviar directamente.',
        { chat_id: chatId, message_id: statusMsg.message_id }
      );
    } else {
      await bot.sendVideo(
        chatId,
        filePath,
        { caption },
        { filename: 'tiktok.mp4', contentType: 'video/mp4' }
      );
      await bot.deleteMessage(chatId, statusMsg.message_id).catch(() => {});
    }

    fs.unlink(filePath, () => {});
  } catch (err) {
    console.error(err);
    await bot.editMessageText(
      '❌ Ocurrió un error al descargar el video. Verifica que el enlace sea válido y público.',
      { chat_id: chatId, message_id: statusMsg.message_id }
    );
  }
});

console.log('🤖 Bot de descarga de TikTok iniciado en modo webhook.');
