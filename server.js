const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;
const geminiApiKey = process.env.GEMINI_API_KEY?.trim();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.post('/api/scan', async (req, res) => {
  const { text } = req.body;

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid text' });
  }

  if (!geminiApiKey || geminiApiKey === 'PASTE_YOUR_GEMINI_API_KEY_HERE') {
    return res.status(500).json({ error: 'Gemini API key is not configured' });
  }

  const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-mini';
  const prompt = `You are a cybersecurity expert. Analyze this message for scams/phishing.\nReply in this exact format:\n1. Risk Level: Safe / Suspicious / Scam\n2. Why: One sentence explanation\n3. Red Flags: Bullet list of suspicious elements\n\nMessage to analyze: "${text}"`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateText?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: { text: prompt } })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Gemini API error', details: data });
    }

    const aiText = data.text ||
      data.output?.[0]?.content?.[0]?.text ||
      data.candidates?.[0]?.content?.[0]?.text ||
      data.choices?.[0]?.message?.content ||
      null;

    if (!aiText) {
      return res.status(500).json({ error: 'Gemini API returned no text', details: data });
    }

    return res.json({ text: aiText, raw: data });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to contact Gemini API', details: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
