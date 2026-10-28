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

const MODELS_TO_TRY = ["gemini-2.0-flash", "gemini-1.5-flash"];
let ai = null;
try {
  if (process.env.GEMINI_API_KEY) ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
} catch(e){ console.log(e.message) }

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/health', (req, res) => res.json({ ok:true, hasKey: !!process.env.GEMINI_API_KEY, aiReady: !!ai, models: MODELS_TO_TRY }));

app.post('/upload', upload.single('receipt'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file" });
    const base64 = req.file.buffer.toString('base64');
    const prompt = `Analyze receipt. Return ONLY JSON: {"DocumentType":"Receipt","Vendor":"name","Total":number,"Items":[{"name":"item","quantity":1,"unit_price":0}]} If not receipt return {"DocumentType":"Irrelevant"}`;
    for (const MODEL of MODELS_TO_TRY) {
      try {
        const result = await ai.models.generateContent({
          model: MODEL,
          contents: [{ role: "user", parts: [{ text: prompt }, { inlineData: { mimeType: req.file.mimetype, data: base64 } }] }]
        });
        let text = (result.text || "").replace(/```json|```/g,'').trim();
        return res.json(JSON.parse(text));
      } catch (e) { console.log(`Fail ${MODEL}: ${e.message}`); continue; }
    }
    throw new Error("All models failed");
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.listen(PORT, ()=>console.log(`✅ LIVE Express4 ${MODELS_TO_TRY.join(',')}`));
