const express = require('express');
const cors = require('cors');
const { GoogleGenAI } = require('@google/genai');

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.static('public'));

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const MODELS = [
  "gemini-3.8-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash"
];

async function tryModels(promptParts) {
  for (const model of MODELS) {
    try {
      console.log(`[SCAN] Trying ${model}`);
      const res = await ai.models.generateContent({
        model,
        contents: [{ role: "user", parts: promptParts }]
      });
      console.log(`[SCAN] Success with ${model}`);
      return { text: res.text, modelUsed: model };
    } catch (err) {
      console.log(`[SCAN] ${model} failed: ${err.message}`);
      continue;
    }
  }
  // All failed → tell frontend to use offline PWA
  return { error: "ALL_MODELS_FAILED", fallback: "PWA_OFFLINE" };
}

app.post('/api/scan', async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) return res.json({ error: "No image" });

    const parts = [
      { text: "Scan this retail image, extract sales/products, return JSON" },
      { inlineData: { mimeType: "image/jpeg", data: imageBase64 } }
    ];

    const result = await tryModels(parts);
    res.json(result);
  } catch (e) {
    res.json({ error: e.message, fallback: "PWA_OFFLINE" });
  }
});

app.get('/health', (req, res) => res.json({ status: "ok", models: MODELS }));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Render backend running on ${PORT} with fallback ${MODELS.join(' -> ')}`));