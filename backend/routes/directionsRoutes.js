const express = require('express');
const router = express.Router();
const { getTravelTime } = require('../services/mapsService');

router.post('/', async (req, res) => {
  try {
    const { origin, destination, mode } = req.body;
    
    if (!origin || !destination || !mode) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    const directions = await getTravelTime(origin, destination, mode);
    res.json(directions);
  } catch (error) {
    console.error('Directions error:', error);
    res.status(500).json({ error: 'Failed to get directions' });
  }
});

module.exports = router;