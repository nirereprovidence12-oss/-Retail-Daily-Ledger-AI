require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenAI } = require('@google/genai');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.static('public'));

// Check key
if (!process.env.GEMINI_API_KEY) {
  console.error("❌ Missing GEMINI_API_KEY in .env");
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Your safe fallback list
const MODELS = [
  "gemini-2.0-flash-exp",
  "gemini-1.5-flash",
  "gemini-1.5-flash-8b"
];

async function tryModels(parts) {
  for (const model of MODELS) {
    try {
      console.log(`Trying ${model}...`);
      const result = await ai.models.generateContent({
        model: model,
        contents: [{ role: "user", parts }]
      });
      console.log(`✅ Success with ${model}`);
      return { text: result.text, modelUsed: model };
    } catch (e) {
      console.log(`❌ ${model} failed: ${e.message}`);
    }
  }
  return { error: "ALL_MODELS_FAILED", fallback: "PWA_OFFLINE" };
}

app.post('/api/scan', async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) return res.json({ error: "No image" });

    const parts = [
      { text: "Extract receipt sales data as valid JSON. Be accurate." },
      { inlineData: { mimeType: "image/jpeg", data: imageBase64 } }
    ];

    const result = await tryModels(parts);
    res.json(result);

  } catch (e) {
    res.json({ error: e.message, fallback: "PWA_OFFLINE" });
  }
});

app.get('/health', (req, res) => {
  res.json({ 
    ok: true, 
    hasKey: !!process.env.GEMINI_API_KEY,
    port: process.env.PORT,
    models: MODELS 
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on ${PORT}`);
  console.log(`✅ Models: ${MODELS.join(' -> ')}`);
});