const express = require('express');
const multer = require('multer');
const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(express.json());

const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

app.get('/', (req, res) => {
  res.send('Retail Daily Ledger AI Backend is Live!');
});

// Robust Endpoint with Model Fallbacks (3.8 -> 3.6 -> 3.5)
app.post('/upload', upload.single('receipt'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded.' });
    }

    if (!ai || !apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is missing on the server.' });
    }

    const imagePart = {
      inlineData: {
        data: req.file.buffer.toString('base64'),
        mimeType: req.file.mimetype
      }
    };

    const prompt = `Analyze this uploaded retail document image (supplier receipt, invoice, or register Z-report). 
    Extract the real data visible in the image and return ONLY a valid JSON object matching this structure precisely:
    {
      "Vendor": "Actual store or supplier name found on the image",
      "Total": 0.00,
      "Items": [
        { "name": "actual product name on receipt", "quantity": 1, "unit_price": 0.00, "expiry_date": "2026-12-31" }
      ],
      "DocumentType": "Receipt or ZReport or Irrelevant"
    }
    If the image is blank or irrelevant, set DocumentType to "Irrelevant" and Total to 0. Do not include markdown code ticks.`;

    const modelsToTry = ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.5-flash-lite'];
    let responseText = null;
    let lastError = null;

    for (const modelName of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: [prompt, imagePart]
        });
        if (response && response.text) {
          responseText = response.text.trim();
          break;
        }
      } catch (err) {
        console.warn(`Model ${modelName} failed, trying next fallback...`, err.message);
        lastError = err;
      }
    }

    if (!responseText) {
      throw lastError || new Error("All model fallbacks failed.");
    }

    if (responseText.startsWith('```json')) {
      responseText = responseText.replace(/^```json/, '').replace(/```$/, '').trim();
    } else if (responseText.startsWith('```')) {
      responseText = responseText.replace(/^```/, '').replace(/```$/, '').trim();
    }

    const parsedData = JSON.parse(responseText);
    res.json(parsedData);
  } catch (error) {
    console.error('AI Vision Processing Error:', error);
    res.status(500).json({ error: error.message || 'Failed to process document with Gemini AI.' });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
