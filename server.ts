import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { v2 as cloudinary } from 'cloudinary';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === 'production';
const port = Number(process.env.PORT) || 3000;

// Cloudinary client helper
function getCloudinary() {
  const rawUrl = (
    process.env.CLOUDINARY_URL ||
    process.env.CLOUDINARY_API_SECRET ||
    ''
  ).trim();

  let cloud_name = (process.env.CLOUDINARY_CLOUD_NAME || '').trim().replace(/^["']|["']$/g, '');
  let api_key = (process.env.CLOUDINARY_API_KEY || '').trim().replace(/^["']|["']$/g, '');
  let api_secret = (process.env.CLOUDINARY_API_SECRET || '').trim().replace(/^["']|["']$/g, '');

  if (rawUrl.includes('cloudinary://')) {
    const cleanUrl = rawUrl.replace(/^CLOUDINARY_URL=/, '').trim().replace(/^["']|["']$/g, '');
    const match = cleanUrl.match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);
    if (match) {
      api_key = match[1];
      api_secret = match[2];
      cloud_name = match[3];
    }
  }

  if (!cloud_name || !api_key || !api_secret) {
    return null;
  }

  cloudinary.config({
    cloud_name,
    api_key,
    api_secret,
    secure: true,
  });

  return cloudinary;
}

// Helper to get GoogleGenAI client with current environment key
function getAiClient() {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Helper to clean and parse JSON from Gemini text response
function extractJsonFromText(text: string): any {
  if (!text) return null;
  let clean = text.trim();
  // Strip Markdown code fences if present
  if (clean.startsWith('```')) {
    clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  }
  // Find first { and last }
  const firstBrace = clean.indexOf('{');
  const lastBrace = clean.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    clean = clean.substring(firstBrace, lastBrace + 1);
  }
  return JSON.parse(clean);
}

// Call Gemini with fallback between models in case of temporary 503 high demand
async function generateWithGemini(contents: string, tools?: any[]) {
  const ai = getAiClient();
  const models = ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'];
  let lastError: any = null;

  for (const model of models) {
    try {
      const callPromise = ai.models.generateContent({
        model,
        contents,
        ...(tools && tools.length > 0 ? { tools } : {}),
      });

      // 12-second timeout per attempt to keep UI snappy
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout on model ${model}`)), 12000)
      );

      const response = await Promise.race([callPromise, timeoutPromise]);
      if (response && response.text) {
        return response.text;
      }
    } catch (err: any) {
      console.warn(`Model ${model} response:`, err?.message || err);
      lastError = err;
      // If error is authentication-related (401), don't retry subsequent models
      if (
        err?.status === 401 ||
        err?.message?.includes('401') ||
        err?.message?.includes('UNAUTHENTICATED') ||
        err?.message?.includes('ACCESS_TOKEN_TYPE_UNSUPPORTED')
      ) {
        break;
      }
    }
  }

  throw lastError || new Error('All Gemini models failed');
}

// In-memory sliding window rate limiter for image uploads (max 15 uploads per hour per user)
const userUploadTimestamps = new Map<string, number[]>();

function checkUserUploadRateLimit(userId: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const ONE_HOUR = 60 * 60 * 1000;
  const history = userUploadTimestamps.get(userId) || [];
  const recent = history.filter((t) => now - t < ONE_HOUR);

  if (recent.length >= 15) {
    userUploadTimestamps.set(userId, recent);
    return { allowed: false, remaining: 0 };
  }

  recent.push(now);
  userUploadTimestamps.set(userId, recent);
  return { allowed: true, remaining: 15 - recent.length };
}

// Automated content moderation with Gemini Vision before touching Cloudinary
async function checkImageSafety(
  imageData: string
): Promise<{ safe: boolean; reason?: string }> {
  try {
    if (!imageData.startsWith('data:image/')) {
      return { safe: true };
    }

    const ai = getAiClient();
    const mimeMatch = imageData.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const base64Data = imageData.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '');

    // Skip evaluation for tiny thumbnails/icons (< 2KB)
    if (base64Data.length < 2500) {
      return { safe: true };
    }

    const prompt = `You are a strict automated safety filter for a tech hardware & video game catalog app.
Determine whether this image violates safety standards.
Violation categories:
- Explicit pornography, nudity, or sexually explicit acts (NSFW)
- Extreme graphic violence, gore, or bloodshed
- Illegal drugs or hate symbols

Respond ONLY in strict JSON format:
{
  "safe": true/false,
  "reason": "Brief explanation if unsafe, otherwise empty"
}`;

    const models = ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'];
    for (const model of models) {
      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Moderation timeout')), 7000)
        );

        const callPromise = ai.models.generateContent({
          model,
          contents: [
            prompt,
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
          ],
        });

        const resp = await Promise.race([callPromise, timeoutPromise]);
        const text = resp.text || '';
        const parsed = extractJsonFromText(text);
        if (parsed && typeof parsed.safe === 'boolean') {
          return parsed;
        }
      } catch (mErr: any) {
        // Try next model if timeout or rate-limited
      }
    }

    // Default safe if moderation service is temporarily busy
    return { safe: true };
  } catch (err: any) {
    console.warn('Image safety check warning:', err?.message || err);
    return { safe: true };
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  // CORS headers to allow GitHub Pages or any client origin to call the API
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // API Route: AI suggestions for Devices
  app.post('/api/gemini/suggest-device', async (req, res) => {
    try {
      const { name, availableCategories = [], language = 'es' } = req.body;
      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ error: 'Device name is required' });
      }

      const prompt = `You are an expert hardware and retro emulation specialist.
Find verified real-world technical specifications from the web for the tech hardware/device named: "${name.trim()}".

Target language for descriptions: ${language === 'es' ? 'Spanish' : 'English'}.
Categories currently configured in the user's app: ${JSON.stringify(availableCategories)}.

Please return ONLY a valid, single JSON object with the following fields:
{
  "system": "exact operating system name and version (e.g. Android 15, Windows 11 Home, SteamOS 3.5, Linux Batocera, etc.)",
  "cpu": "exact processor / SoC model name (e.g. Qualcomm Snapdragon 8 Elite, Intel Core i7-13700H, AMD Ryzen 7 7840U, Unisoc T820, Allwinner H700, etc.)",
  "category": "one matching category from the user's list or a standard name like Celular, Consola Portátil, PC / Laptop, Mini PC, Tablet",
  "emulationOverview": "concise summary of emulation performance (max 280 characters). State which console systems it runs smoothly (e.g., PS2, Switch, GameCube, PSP, PS1, 16-bit)",
  "notes": "concise bulleted or short paragraph notes (max 450 characters) covering display resolution/refresh rate, RAM, battery size, and cooling",
  "isGamingDevice": true or false,
  "emulationScores": {
    "ps2": integer rating 1 to 5 (5=full speed, 4=very good, 3=playable, 2=slow, 1=unplayable),
    "gamecube": integer 1 to 5,
    "switch": integer 1 to 5,
    "psp": integer 1 to 5,
    "3ds": integer 1 to 5,
    "ps1": integer 1 to 5,
    "n64": integer 1 to 5,
    "snes": integer 1 to 5
  }
}

Do NOT wrap the output in extra commentary or text outside the JSON. Return only the raw JSON.`;

      const text = await generateWithGemini(prompt, [{ googleSearch: {} }]);
      const data = extractJsonFromText(text);
      return res.json({ success: true, data });
    } catch (err: any) {
      const isAuthError =
        err?.status === 401 ||
        err?.message?.includes('401') ||
        err?.message?.includes('UNAUTHENTICATED') ||
        err?.message?.includes('ACCESS_TOKEN_TYPE_UNSUPPORTED');

      if (isAuthError) {
        return res.status(401).json({
          error: 'UNAUTHENTICATED',
          message:
            req.body?.language === 'es'
              ? 'La clave de Gemini API no es válida o no tiene permisos en Google Cloud. Por favor selecciona una clave válida en el panel de Secretos.'
              : 'Invalid Gemini API key or missing permissions in Google Cloud. Please configure a valid key in the Secrets panel.',
        });
      }

      const isQuotaError =
        err?.status === 429 ||
        err?.message?.includes('429') ||
        err?.message?.includes('RESOURCE_EXHAUSTED') ||
        err?.message?.includes('Quota exceeded');

      if (isQuotaError) {
        return res.status(429).json({
          error: 'QUOTA_EXCEEDED',
          message:
            req.body?.language === 'es'
              ? 'Has alcanzado temporalmente el límite gratuito de consultas de IA (Gemini). Puedes continuar registrando los datos manualmente sin problema.'
              : 'Gemini AI free rate limit reached for this period. You can continue filling in the details manually without interruption.',
        });
      }

      console.error('Error in /api/gemini/suggest-device:', err?.message || err);
      return res.status(500).json({
        error: err?.message || 'Failed to generate device suggestions',
      });
    }
  });

  // API Route: AI suggestions for Accessories
  app.post('/api/gemini/suggest-accessory', async (req, res) => {
    try {
      const { name, availableCategories = [], language = 'es' } = req.body;
      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ error: 'Accessory name is required' });
      }

      const prompt = `You are a tech gadget and accessories specialist.
Find verified real-world technical specifications from the web for the tech accessory named: "${name.trim()}".

Target language for descriptions: ${language === 'es' ? 'Spanish' : 'English'}.
Categories currently configured in the user's app: ${JSON.stringify(availableCategories)}.

Please return ONLY a valid, single JSON object with the following fields:
{
  "category": "the best matching category from user's list or a clear name like Mandos / Controles, Docks / Hubs, Auriculares, Cables, Fundas, Almacenamiento, Cargadores",
  "description": "concise description of features, materials, connectivity and specs (max 280 characters)",
  "tags": ["array", "of", "3", "to", "6", "concise", "lowercase", "tags", "such", "as", "bluetooth", "usb-c", "hall-effect", "inalambrico"]
}

Do NOT wrap the output in extra commentary. Return only the raw JSON.`;

      const text = await generateWithGemini(prompt, [{ googleSearch: {} }]);
      const data = extractJsonFromText(text);
      return res.json({ success: true, data });
    } catch (err: any) {
      const isAuthError =
        err?.status === 401 ||
        err?.message?.includes('401') ||
        err?.message?.includes('UNAUTHENTICATED') ||
        err?.message?.includes('ACCESS_TOKEN_TYPE_UNSUPPORTED');

      if (isAuthError) {
        return res.status(401).json({
          error: 'UNAUTHENTICATED',
          message:
            req.body?.language === 'es'
              ? 'La clave de Gemini API no es válida o no tiene permisos en Google Cloud. Por favor selecciona una clave válida en el panel de Secretos.'
              : 'Invalid Gemini API key or missing permissions in Google Cloud. Please configure a valid key in the Secrets panel.',
        });
      }

      const isQuotaError =
        err?.status === 429 ||
        err?.message?.includes('429') ||
        err?.message?.includes('RESOURCE_EXHAUSTED') ||
        err?.message?.includes('Quota exceeded');

      if (isQuotaError) {
        return res.status(429).json({
          error: 'QUOTA_EXCEEDED',
          message:
            req.body?.language === 'es'
              ? 'Has alcanzado temporalmente el límite gratuito de consultas de IA (Gemini). Puedes continuar registrando los datos manualmente sin problema.'
              : 'Gemini AI free rate limit reached for this period. You can continue filling in the details manually without interruption.',
        });
      }

      console.error('Error in /api/gemini/suggest-accessory:', err?.message || err);
      return res.status(500).json({
        error: err?.message || 'Failed to generate accessory suggestions',
      });
    }
  });

  // API Route: Cloudinary secure image upload with 3 safety layers
  app.post('/api/cloudinary/upload', async (req, res) => {
    try {
      const cld = getCloudinary();
      if (!cld) {
        return res.status(503).json({
          error: 'CLOUDINARY_NOT_CONFIGURED',
          message:
            'Cloudinary no está configurado. Por favor agrega CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET en Render.',
        });
      }

      const { image, userId, entityType = 'devices', publicId, language = 'es' } = req.body;
      if (!image || typeof image !== 'string') {
        return res.status(400).json({ error: 'Image data (base64 or URL) is required' });
      }

      // Layer 2: Authentication requirement (only signed-in users can upload to Cloudinary)
      if (
        !userId ||
        typeof userId !== 'string' ||
        userId.trim() === '' ||
        userId === 'anonymous' ||
        userId.length < 5
      ) {
        return res.status(401).json({
          error: 'AUTH_REQUIRED',
          message:
            language === 'en'
              ? 'You must sign in with Google to upload photos to cloud storage. You can still paste image URLs.'
              : 'Debes iniciar sesión con Google para subir fotos a la nube. Puedes seguir usando enlaces URL directos.',
        });
      }

      const cleanUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '_');

      // Layer 3A: Rate limiting (max 15 uploads per hour per user)
      const rateCheck = checkUserUploadRateLimit(cleanUserId);
      if (!rateCheck.allowed) {
        return res.status(429).json({
          error: 'RATE_LIMIT_EXCEEDED',
          message:
            language === 'en'
              ? 'Rate limit reached: Maximum 15 uploads per hour per user. You can still use direct image URLs.'
              : 'Límite de subidas alcanzado: Máximo 15 imágenes por hora por usuario. Puedes seguir usando enlaces URL directos.',
        });
      }

      // Layer 3B: Size limit (max ~6MB base64)
      if (image.length > 8.5 * 1024 * 1024) {
        return res.status(413).json({
          error: 'FILE_TOO_LARGE',
          message:
            language === 'en'
              ? 'The image exceeds the 6 MB limit. Please select a smaller photo.'
              : 'La imagen excede el límite de 6 MB. Por favor elige una foto más liviana.',
        });
      }

      // Layer 1: Automated Gemini Vision Content Safety Check (pre-filter before Cloudinary)
      const safety = await checkImageSafety(image);
      if (!safety.safe) {
        return res.status(400).json({
          error: 'IMAGE_REJECTED_NSFW',
          message:
            language === 'en'
              ? `Upload rejected by safety filter: ${safety.reason || 'Inappropriate or explicit content detected'}.`
              : `Imagen rechazada por el filtro de seguridad: ${safety.reason || 'Se detectó contenido inapropiado o explícito'}.`,
        });
      }

      const cleanType =
        entityType && typeof entityType === 'string'
          ? entityType.replace(/[^a-zA-Z0-9_-]/g, '_')
          : 'devices';

      const folder = `collectahub/users/${cleanUserId}/${cleanType}`;

      const uploadOptions: any = {
        folder,
        overwrite: true,
        resource_type: 'image',
      };

      if (publicId && typeof publicId === 'string' && publicId.includes(cleanUserId)) {
        uploadOptions.public_id = publicId.split('/').pop();
      }

      const result = await cld.uploader.upload(image, uploadOptions);

      // Construct optimized CDN delivery URL dynamically without signature mismatch
      const optimizedUrl = cld.url(result.public_id, {
        transformation: [
          { width: 1280, height: 1280, crop: 'limit' },
          { quality: 'auto' },
          { fetch_format: 'auto' },
        ],
        secure: true,
      });

      return res.json({
        success: true,
        url: optimizedUrl || result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,
      });
    } catch (err: any) {
      console.error('Error in /api/cloudinary/upload:', err?.message || err);

      if (
        err?.message?.includes('Invalid Signature') ||
        err?.http_code === 401 ||
        err?.message?.includes('401')
      ) {
        return res.status(401).json({
          error: 'CLOUDINARY_INVALID_CREDENTIALS',
          message:
            req.body?.language === 'en'
              ? 'Invalid Cloudinary credentials (Invalid Signature). Please check CLOUDINARY_API_SECRET and CLOUDINARY_API_KEY in Render Environment for extra spaces or quotes.'
              : 'Error de credenciales en Cloudinary (Invalid Signature). Revisa en las variables de Render que CLOUDINARY_API_SECRET y CLOUDINARY_API_KEY no tengan espacios en blanco o comillas accidentales.',
        });
      }

      const isCloudinaryQuota =
        err?.http_code === 420 ||
        err?.message?.includes('Resource limit exceeded') ||
        err?.message?.includes('quota');

      if (isCloudinaryQuota) {
        return res.status(429).json({
          error: 'CLOUDINARY_QUOTA_EXCEEDED',
          message:
            req.body?.language === 'en'
              ? 'Monthly free cloud storage quota reached on Cloudinary. You can continue adding images via direct web URLs.'
              : 'Se ha alcanzado la cuota mensual de almacenamiento gratuito en Cloudinary. Puedes seguir añadiendo fotos mediante enlaces URL de internet.',
        });
      }

      return res.status(500).json({
        error: 'UPLOAD_FAILED',
        message: err?.message || 'Error al subir la imagen a Cloudinary',
      });
    }
  });

  // API Route: Cloudinary secure image delete
  app.post('/api/cloudinary/delete', async (req, res) => {
    try {
      const cld = getCloudinary();
      if (!cld) {
        return res.status(503).json({ error: 'CLOUDINARY_NOT_CONFIGURED' });
      }

      const { publicId, userId } = req.body;
      if (!publicId || typeof publicId !== 'string') {
        return res.status(400).json({ error: 'publicId is required' });
      }

      // Ensure user can only delete within their own folder
      if (userId && typeof userId === 'string') {
        const cleanUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '_');
        if (!publicId.includes(`users/${cleanUserId}/`)) {
          return res.status(403).json({
            error: 'FORBIDDEN',
            message: 'No tienes permiso para borrar esta imagen',
          });
        }
      }

      const result = await cld.uploader.destroy(publicId);
      return res.json({ success: true, result });
    } catch (err: any) {
      console.error('Error in /api/cloudinary/delete:', err?.message || err);
      return res.status(500).json({ error: 'DELETE_FAILED', message: err?.message });
    }
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', serverTime: new Date().toISOString() });
  });

  // Mount Vite in development or static in production
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`CollectaHub server running at http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
