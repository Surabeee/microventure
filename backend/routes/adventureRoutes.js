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
    
    console.log(`Generating adventure in ${city} for ${durationHours} hours by ${transportMode}`);
    if (location) {
      console.log(`Starting from coordinates: ${location.latitude}, ${location.longitude}`);
    }
    
    // Enhanced error handling
    try {
      const adventure = await generateAdventure(city, durationHours, transportMode, location);
      res.json(adventure);
    } catch (error) {
      console.error('Adventure generation detailed error:', error);
      
      // If the error is related to finding locations, use the fallback mechanism
      if (error.message && error.message.includes('find')) {
        console.log("Using fallback adventure generation due to location error");
        // Generate a simple adventure with dummy locations
        const fallbackAdventure = await generateFallbackAdventure(city, durationHours, transportMode, location);
        return res.json(fallbackAdventure);
      }
      
      throw error; // Re-throw if it's a different kind of error
    }
  } catch (error) {
    console.error('Adventure generation error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate adventure' });
  }
});

module.exports = router;