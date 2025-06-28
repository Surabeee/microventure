const express = require('express');
const router = express.Router();
// Import Gemini service and validation middleware
const { generateAdventure } = require('../services/geminiService');
const { validateAdventureRequest } = require('../middleware/errorHandler');

// Generate adventure endpoint with validation
router.post('/generate', validateAdventureRequest, async (req, res, next) => {
  try {
    const { city, radius, transportMode, location, preferences } = req.body;
    
    console.log(`🎯 Generating adventure for ${city} (${radius}km radius, ${transportMode})`);
    console.log('📋 Parameters:', { city, radius, transportMode, location, preferences });
    
    const startTime = Date.now();
    
    // Generate adventure using Gemini service
    const adventure = await generateAdventure(city, radius, transportMode, location, preferences);
    
    const endTime = Date.now();
    const generationTime = endTime - startTime;
    
    console.log(`✅ Adventure generated successfully in ${generationTime}ms`);
    console.log(`📍 Generated ${adventure.stops.length} stops`);
    
    // Add metadata to response
    res.json({
      ...adventure,
      metadata: {
        generatedAt: new Date().toISOString(),
        generationTimeMs: generationTime,
        aiProvider: 'Google Gemini',
        version: '2.0.0',
        searchRadius: `${radius}km`
      }
    });
    
  } catch (error) {
    console.error('❌ Error generating adventure:', error);
    next(error); // Pass to error handler middleware
  }
});

// Get adventure status endpoint (for debugging)
router.get('/status', (req, res) => {
  res.json({
    status: 'operational',
    aiProvider: 'Google Gemini',
    version: '2.0.0',
    features: [
      'Real location discovery',
      'Travel time calculation',
      'AI-generated narratives',
      'Multi-transport support',
      'Preference-based filtering'
    ],
    supportedTransportModes: ['walking', 'public transit', 'car/taxi'],
    supportedPreferences: ['museums', 'parks', 'historical', 'food', 'shopping', 'entertainment', 'cultural', 'nature']
  });
});

module.exports = router;