import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === 'production';
const port = Number(process.env.PORT) || 3000;

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

async function startServer() {
  const app = express();
  app.use(express.json());

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

      console.error('Error in /api/gemini/suggest-accessory:', err?.message || err);
      return res.status(500).json({
        error: err?.message || 'Failed to generate accessory suggestions',
      });
    }
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', serverTime: new Date().toISOString() });
  });

  // Mount Vite in development or static in production
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
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
