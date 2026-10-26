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

// AI Document Scan Endpoint
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

    const prompt = `Analyze this uploaded retail document (supplier receipt, invoice, or register Z-report). 
    Extract the following JSON structure strictly:
    {
      "Vendor": "Name of supplier or store",
      "Total": 0.00,
      "Items": [
        { "name": "product name", "quantity": 1, "unit_price": 0.00, "expiry_date": "YYYY-MM-DD" }
      ],
      "DocumentType": "Receipt or ZReport or Irrelevant"
    }
    If the image is blank, a selfie, or irrelevant, set DocumentType to "Irrelevant" and Total to 0.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [prompt, imagePart]
    });

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
    res.status(500).json({ error: error.message || 'Failed to process document with Gemini AI.' });
  }
});

// Real AI Voice Transcription & Extraction Endpoint
app.post('/voice-parse', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file recorded.' });
    }

    const audioPart = {
      inlineData: {
        data: req.file.buffer.toString('base64'),
        mimeType: req.file.mimetype || 'audio/webm'
      }
    };

    const prompt = `Listen to this vendor speaking about their retail business in Lusaka. 
    Extract what they are saying and format as JSON:
    {
      "transcript": "what the vendor said verbatim",
      "extractedValue": "the numeric amount or product name mentioned",
      "intent": "revenue_update or item_name or expense"
    }`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [prompt, audioPart]
    });

    let textResponse = response.text.trim();
    if (textResponse.startsWith('```json')) {
      textResponse = textResponse.replace(/^```json/, '').replace(/```$/, '').trim();
    } else if (textResponse.startsWith('```')) {
      textResponse = textResponse.replace(/^```/, '').replace(/```$/, '').trim();
    }

    res.json(JSON.parse(textResponse));
  } catch (error) {
    console.error('Voice AI Error:', error);
    res.status(500).json({ error: 'Failed to transcribe audio.' });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
