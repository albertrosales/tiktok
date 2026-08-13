# Bot de Telegram — Descargador de TikTok (desplegado en Render)

Descarga videos de TikTok en la mejor calidad disponible (sin marca de agua) y los envía por Telegram. Corre en modo **webhook**, listo para el plan gratuito de Render.

## Qué incluye

- `index.js` — lógica del bot (recibe el link, descarga con `yt-dlp`, responde el video).
- `Dockerfile` — imagen con Node, Python, ffmpeg y yt-dlp ya instalados.
- `render.yaml` — configuración para desplegar con un clic (Blueprint de Render).

## Paso 1 — Crear el bot en Telegram

1. Habla con [@BotFather](https://t.me/BotFather).
2. Envía `/newbot`, sigue los pasos y copia el **token** que te da.

## Paso 2 — Subir el proyecto a GitHub

Render despliega desde un repositorio. Crea uno (puede ser privado) y sube esta carpeta:

```bash
cd tiktok-bot
git init
git add .
git commit -m "Bot de TikTok para Telegram"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/tiktok-bot.git
git push -u origin main
```

## Paso 3 — Desplegar en Render

1. Entra a [render.com](https://render.com) y crea una cuenta gratis.
2. **New +** → **Web Service**.
3. Conecta tu repositorio de GitHub.
4. Render detectará el `Dockerfile` automáticamente (Environment: Docker).
5. Plan: **Free**.
6. En **Environment Variables**, agrega:
   - `TELEGRAM_BOT_TOKEN` → el token que te dio BotFather.
7. Click en **Create Web Service**.

Render te asigna una URL pública tipo `https://tiktok-bot-xxxx.onrender.com` y la expone automáticamente como `RENDER_EXTERNAL_URL` — el bot la usa para configurar el webhook solo, no tienes que hacer nada más.

## Paso 4 — Probarlo

Espera a que el build termine (unos minutos la primera vez), abre Telegram, busca tu bot, envía `/start` y luego un link de TikTok.

## Limitaciones importantes del plan gratuito de Render

- **Se "duerme" tras 15 minutos sin tráfico**: al llegar un mensaje nuevo de Telegram, Render despierta el servicio automáticamente, pero la primera respuesta puede tardar 30-60 segundos.
- **750 horas gratis al mes** por cuenta (suficiente para un bot personal corriendo todo el mes).
- **Límite de Telegram**: los bots solo pueden enviar archivos de hasta 50MB. Videos más pesados no se podrán enviar directamente.

## Uso responsable

Descarga solo contenido que tengas derecho a usar o para tu consumo personal. Respeta los derechos de autor y los términos de servicio de TikTok — no redistribuyas ni publiques contenido ajeno sin permiso del creador.

## Actualizar yt-dlp

TikTok cambia su plataforma seguido, lo que a veces rompe la descarga. Si eso pasa, sube de nuevo el proyecto a Render (o simplemente haz "Manual Deploy" desde el panel) para que el Dockerfile reinstale la última versión de `yt-dlp`.
