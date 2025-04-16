const express = require('express');
const router = express.Router();
const { generateAdventure } = require('../services/geminiService');

router.post('/generate', async (req, res) => {
  try {
    const { city, duration, transportMode, location } = req.body;
    
    if (!city || !duration || !transportMode) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    // Convert duration to a number
    const durationHours = parseFloat(duration);
    
    if (isNaN(durationHours) || durationHours <= 0) {
      return res.status(400).json({ error: 'Invalid duration' });
    }
    
    // Validate transportation mode
    const validModes = ['walking', 'public transit', 'car/taxi'];
    if (!validModes.includes(transportMode)) {
      return res.status(400).json({ 
        error: 'Invalid transportation mode. Must be "walking", "public transit", or "car/taxi"'
      });
    }
    
    // Validate location if provided
    if (location && (typeof location.latitude !== 'number' || typeof location.longitude !== 'number')) {
      return res.status(400).json({ error: 'Invalid location format' });
    }
    
    const adventure = await generateAdventure(city, durationHours, transportMode, location);
    res.json(adventure);
  } catch (error) {
    console.error('Adventure generation error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate adventure' });
  }
});

module.exports = router;