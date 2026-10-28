const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

const { GoogleGenAI } = require('@google/genai');

const app = express();
const PORT = process.env.PORT || 10000;
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const MODELS = ["gemini-2.0-flash-exp","gemini-1.5-flash"];
let ai = null;
try {
  if (process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
} catch(e){ console.log("AI init failed", e.message) }

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/health', (req, res) => {
  res.json({ ok:true, hasKey: !!process.env.GEMINI_API_KEY, aiReady: !!ai, models: MODELS });
});

app.post('/upload', upload.single('receipt'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    if (!ai) return res.status(500).json({ error: "AI not configured" });

    const base64 = req.file.buffer.toString('base64');
    const prompt = `You are a retail receipt parser for Zambia. Analyze this image. Return ONLY valid JSON, no markdown: {"DocumentType":"Receipt or Z-Report or Irrelevant","Vendor":"shop name","Total":number,"Items":[{"name":"item name","quantity":number,"unit_price":number,"expiry_date":"YYYY-MM-DD or null"}]} If image is not a receipt/Z-report, return {"DocumentType":"Irrelevant"}`;

    const result = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: [{
        role: "user",
        parts: [
          { text: prompt },
          { inlineData: { mimeType: req.file.mimetype, data: base64 } }
        ]
      }]
    });

    let text = result.text;
    if (!text && result.response) text = result.response.text();
    text = text.replace(/```json|```/g,'').trim();
    
    const json = JSON.parse(text);
    res.json(json);
  } catch (e) {
    console.error("Upload error:", e);
    res.status(500).json({ error: e.message, DocumentType: "Irrelevant" });
  }
});

app.listen(PORT, ()=>console.log(`✅ LIVE on ${PORT} hasKey:${!!process.env.GEMINI_API_KEY}`));
