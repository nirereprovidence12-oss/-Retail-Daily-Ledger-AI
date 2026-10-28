const functions = require('firebase-functions');
const cors = require('cors')({origin:true});
const { GoogleGenerativeAI } = require('@google/generative-ai');

exports.scanReceipt = functions.https.onRequest((req,res)=>{
  cors(req,res, async ()=>{
    if(req.method==='OPTIONS') return res.status(200).end();
    try{
      const GEMINI_KEY = process.env.GEMINI_KEY || functions.config().gemini?.key;
      if(!GEMINI_KEY) return res.status(500).json({error:'GEMINI_KEY not set in Functions secret'});
      const genAI = new GoogleGenerativeAI(GEMINI_KEY);
      const MODELS = ['gemini-2.0-flash-exp','gemini-1.5-flash-8b','gemini-1.5-flash']; // your 3.8,3.6,3.5
      let fileData = req.body?.imageBase64 || req.body?.data;
      if(!fileData && req.body) { // fallback for FormData
        return res.status(400).json({error:'Send imageBase64'});
      }
      const prompt = `Extract receipt as JSON only: {Vendor:string, Total:number, Items:[{name,quantity,unit_price}], DocumentType:"Receipt" or "Irrelevant"}. If not receipt/invoice/z-report return DocumentType Irrelevant. Return ONLY JSON.`;
      for(let modelName of MODELS){
        try{
          const model = genAI.getGenerativeModel({model:modelName});
          const result = await model.generateContent([{text:prompt},{inlineData:{mimeType:'image/jpeg',data:fileData}}]);
          let txt = result.response.text().replace(/```json|```/g,'').trim();
          let json = JSON.parse(txt);
          return res.json(json);
        }catch(e){ console.log(modelName+' fail',e.message); continue; }
      }
      return res.status(500).json({error:'All Gemini models failed'});
    }catch(e){ return res.status(500).json({error:e.message}); }
  });
});
