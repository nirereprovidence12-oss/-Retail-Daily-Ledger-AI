import express from 'express';
import multer from 'multer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// List of supported Gemini Flash models to fallback through during peak traffic spikes
const GEMINI_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite'
];

app.post('/upload', upload.single('receipt'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please select a receipt image file.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: 'GEMINI_API_KEY is missing from environment variables.' });
    }

    const imageBase64 = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype;

    const promptText = `Analyze this retail supplier receipt image. 
Extract the vendor/store name, total amount paid (ZMW), tax amount, and every individual line item. 
Return ONLY valid raw JSON with this exact schema:
{
  "vendor": "string",
  "total": 0.00,
  "tax": 0.00,
  "items": [
    {
      "name": "string",
      "quantity": 1,
      "unit_price": 0.00,
      "price": 0.00,
      "days_to_expiry": 90
    }
  ]
}`;

    let lastError = null;
    let receiptData = null;

    // Loop through fallback models if Google returns high demand / 503 errors
    for (const modelName of GEMINI_MODELS) {
      try {
        console.log(`Attempting receipt parse with model: ${modelName}...`);
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

        const apiResponse = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { inlineData: { mimeType: mimeType, data: imageBase64 } },
                  { text: promptText }
                ]
              }
            ],
            generationConfig: {
              responseMimeType: 'application/json'
            }
          })
        });

        const result = await apiResponse.json();

        if (result.error) {
          // If high demand or unavailable, save error and try next model
          console.warn(`Model ${modelName} returned error: ${result.error.message}`);
          lastError = result.error.message;
          continue; 
        }

        const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!responseText) {
          lastError = `Model ${modelName} returned an empty response.`;
          continue;
        }

        const cleanJsonText = responseText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
        receiptData = JSON.parse(cleanJsonText);
        
        console.log(`✅ Successfully parsed receipt using ${modelName}:`, receiptData.vendor, `ZMW ${receiptData.total}`);
        break; // Stop loop on success!
      } catch (err) {
        console.warn(`Failed call on ${modelName}: ${err.message}`);
        lastError = err.message;
      }
    }

    if (!receiptData) {
      throw new Error(`All Gemini Flash models failed or are at capacity. Last error: ${lastError}`);
    }

    return res.json({
      success: true,
      Vendor: receiptData.vendor || 'Supplier Vendor',
      Total: Number(receiptData.total || 0),
      Tax: Number(receiptData.tax || 0),
      Items: Array.isArray(receiptData.items) ? receiptData.items : []
    });

  } catch (err) {
    console.error('Receipt processing error:', err.message);
    return res.status(500).json({
      error: 'Receipt scanning failed on server.',
      details: err.message
    });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Retail Ledger Server running at http://localhost:${PORT}`);
});