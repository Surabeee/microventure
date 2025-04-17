const express = require('express');
const router = express.Router();
const { generateAdventure, createFallbackAdventure, generateFallbackLocations } = require('../services/geminiService');
const { geocodeAddress } = require('../services/mapsService');

router.post('/generate', async (req, res) => {
  try {
    const { city, duration, transportMode, location, preferences } = req.body;
    
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
    
    // Define startLocation so it's accessible in catch blocks
    let startLocation;
    
    try {
      // If location is not provided, geocode the city center
      if (!location) {
        try {
          startLocation = await geocodeAddress(`${city} city center`, city);
          console.log(`Using geocoded city center: ${JSON.stringify(startLocation)}`);
        } catch (geocodeError) {
          console.error("Error geocoding city center:", geocodeError);
          return res.status(400).json({ 
            error: `Could not locate the center of ${city}. Please provide a specific location.` 
          });
        }
      } else {
        startLocation = location;
      }
      
      // Time validation checks based on transport mode
      const timeValidationResult = validateTimeAndTransport(durationHours, transportMode);
      if (!timeValidationResult.isValid) {
        return res.status(400).json({
          error: timeValidationResult.message,
          suggestion: timeValidationResult.suggestion
        });
      }
      
      // Generate the adventure with enhanced options
      const adventure = await generateAdventure(
        city, 
        durationHours, 
        transportMode, 
        startLocation,
        preferences || []
      );
      
      res.json(adventure);
    } catch (error) {
      console.error('Adventure generation detailed error:', error);
      
      // If the error is related to finding locations, use the fallback mechanism
      if (error.message && (error.message.includes('find') || error.message.includes('locations'))) {
        console.log("Using fallback adventure generation due to location error");
        
        // Generate fallback locations
        const fallbackLocations = generateFallbackLocations(
          startLocation, 
          city, 
          durationHours, 
          transportMode
        );
        
        // Create a fallback adventure with those locations
        const fallbackAdventure = await createFallbackAdventure(
          fallbackLocations, 
          startLocation, 
          city, 
          durationHours, 
          transportMode
        );
        
        return res.json(fallbackAdventure);
      }
      
      // Handle other types of errors
      if (error.message && error.message.includes('time constraints')) {
        return res.status(400).json({
          error: 'The requested adventure cannot be completed in the given time.',
          suggestion: `Try increasing your available time or switching to a faster mode of transportation.`
        });
      }
      
      throw error; // Re-throw if it's a different kind of error
    }
  } catch (error) {
    console.error('Adventure generation error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate adventure' });
  }
});

/**
 * Validate if the requested time and transport mode combination is feasible
 */
function validateTimeAndTransport(durationHours, transportMode) {
  // Minimum time needed based on transport mode
  const minimumTimeByMode = {
    'walking': 1.5,     // At least 1.5 hours for walking adventures
    'public transit': 1, // At least 1 hour for transit
    'car/taxi': 0.5      // At least 30 minutes for driving
  };
  
  const minTime = minimumTimeByMode[transportMode] || 1;
  
  if (durationHours < minTime) {
    let suggestion;
    if (transportMode === 'walking') {
      suggestion = `Consider using public transit or car/taxi, or increase your time to at least ${minTime} hours.`;
    } else if (transportMode === 'public transit') {
      suggestion = `Consider using a car/taxi, or increase your time to at least ${minTime} hours.`;
    } else {
      suggestion = `Please increase your available time to at least ${minTime} hours.`;
    }
    
    return {
      isValid: false,
      message: `An adventure using ${transportMode} requires at least ${minTime} hours to be meaningful.`,
      suggestion
    };
  }
  
  return { isValid: true };
}

module.exports = router;