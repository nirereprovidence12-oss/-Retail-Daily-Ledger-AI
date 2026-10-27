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

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.get('/', (req, res) => {
  res.send('Retail Daily Ledger AI Backend is Live!');
});

app.post('/upload', upload.single('receipt'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded.' });
    }

    const imagePart = {
      inlineData: {
        data: req.file.buffer.toString('base64'),
        mimeType: req.file.mimetype
      }
    };

    const prompt = `You are a strict retail auditor AI for Lusaka micro-retailers. Analyze this uploaded image. 
    Determine if it is a valid retail document (either a Supplier Receipt/Invoice containing a vendor name and total, OR a Register Z-Report/Sales Slip containing daily sales totals).
    
    If the image is a selfie, a landscape, a blank photo, a random object, or irrelevant to retail accounting, you MUST set "DocumentType": "Irrelevant".

    Extract the following JSON structure strictly:
    {
      "Vendor": "Name of supplier or store or null",
      "Total": 0.00,
      "Items": [
        { "name": "product name", "quantity": 1, "unit_price": 0.00, "expiry_date": "YYYY-MM-DD" }
      ],
      "DocumentType": "Receipt" or "ZReport" or "Irrelevant"
    }`;

    let response;
    // Your requested model fallback array
    const modelsToTry = ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-2.5-flash'];
    
    for (const modelName of modelsToTry) {
      try {
        response = await ai.models.generateContent({
          model: modelName,
          contents: [prompt, imagePart]
        });
        if (response && response.text) break;
      } catch (err) {
        console.warn(`Model ${modelName} failed, trying fallback...`);
      }
    }

    if (!response || !response.text) {
      throw new Error('All model fallbacks failed to generate content.');
    }

    let textResponse = response.text.trim();
    if (textResponse.startsWith('```json')) {
      textResponse = textResponse.replace(/^```json/, '').replace(/```$/, '').trim();
    } else if (textResponse.startsWith('```')) {
      textResponse = textResponse.replace(/^```/, '').replace(/```$/, '').trim();
    }

    const parsedData = JSON.parse(textResponse);
    res.json(parsedData);
  } catch (error) {
    console.error('AI Processing Error:', error);
    res.status(500).json({ error: 'Failed to process document with Gemini AI.' });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});