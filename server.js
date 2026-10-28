require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.static('public'));

let ai = null;
let MODELS = ["gemini-2.0-flash-exp", "gemini-1.5-flash"];

try {
  const { GoogleGenAI } = require('@google/genai');
  if (process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    console.log("✅ Gemini AI loaded");
  }
} catch(e) {
  console.log("⚠️ Gemini lib not ready yet:", e.message);
}

async function tryModels(parts) {
  if (!ai) return { fallback: "PWA_OFFLINE", note: "AI lib not installed" };
  for (const m of MODELS) {
    try {
      const r = await ai.models.generateContent({ model: m, contents: [{ role:"user", parts }] });
      return { text: r.text, modelUsed: m };
    } catch(e) { console.log(`${m} failed`); }
  }
  return { fallback: "PWA_OFFLINE" };
}

app.post('/api/scan', async (req,res)=>{
  const parts = [{ text: "Extract as JSON" }, { inlineData:{ mimeType:"image/jpeg", data: req.body.imageBase64 }}];
  res.json(await tryModels(parts));
});

app.get('/health',(req,res)=>res.json({ ok:true, hasKey: !!process.env.GEMINI_API_KEY, aiReady: !!ai, models: MODELS }));

const PORT = process.env.PORT || 10000;
app.listen(PORT, ()=>console.log(`✅ LIVE on ${PORT}`));