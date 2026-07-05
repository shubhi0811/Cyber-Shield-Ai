const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.post('/api/scan', (req, res) => {
  const { text } = req.body;
  if (!text || text.trim() === '') {
    return res.status(400).json({ error: 'Please enter some text to analyze' });
  }

  const lowerText = text.toLowerCase();
  let score = 0;
  const redFlags = [];
  const checks = [
    { pattern: /lottery|winner|prize|congratulations.*won/i, points: 30, flag: 'Unexpected prize/lottery win' },
    { pattern: /click here|claim now|act now|urgent/i, points: 25, flag: 'Urgent call to action' },
    { pattern: /verify.*account|suspended|locked/i, points: 25, flag: 'Fake account security threat' },
    { pattern: /bitcoin|crypto investment|guaranteed return/i, points: 20, flag: 'Crypto/investment scam' },
    { pattern: /free money|earn \$\d+/i, points: 30, flag: 'Promises free money' },
    { pattern: /bank.*details|ssn|social security/i, points: 35, flag: 'Requests sensitive info' },
    { pattern: /paypal.*security|netflix.*billing/i, points: 25, flag: 'Impersonates trusted brand' }
  ];

  checks.forEach(check => {
    if (check.pattern.test(lowerText)) {
      score += check.points;
      redFlags.push(check.flag);
    }
  });

  let riskLevel = 'Safe';
  if (score >= 55) riskLevel = 'Scam';
  else if (score >= 30) riskLevel = 'Suspicious';

  res.json({
    riskLevel: riskLevel,
    score: Math.min(score, 100),
    why: redFlags.length ? `Detected: ${redFlags.join(', ')}` : 'No common scam patterns found.',
    redFlags: redFlags
  });
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`Port ${port} is already in use. Please stop the conflicting process and try again.`);
    process.exit(1);
  } else {
    console.error(err);
    process.exit(1);
  }
});
