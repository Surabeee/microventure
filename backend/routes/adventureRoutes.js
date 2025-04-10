const express = require('express');
const router = express.Router();
const { generateAdventure } = require('../services/geminiService');

router.post('/generate', async (req, res) => {
  try {
    const { city, duration, transportMode } = req.body;
    
    if (!city || !duration || !transportMode) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    const adventure = await generateAdventure(city, duration, transportMode);
    res.json(adventure);
  } catch (error) {
    console.error('Adventure generation error:', error);
    res.status(500).json({ error: 'Failed to generate adventure' });
  }
});

module.exports = router;