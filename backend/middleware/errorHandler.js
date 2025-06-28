// Error handling middleware for the adventure API

/**
 * Adventure-specific error handler
 */
function adventureErrorHandler(error, req, res, next) {
    console.error('Adventure Error:', error);
    
    // Gemini API specific errors
    if (error.message.includes('GEMINI_API_KEY')) {
      return res.status(500).json({
        error: 'AI service configuration error',
        message: 'Adventure generation temporarily unavailable',
        code: 'GEMINI_CONFIG_ERROR'
      });
    }
    
    // Mapbox API specific errors
    if (error.message.includes('MAPBOX_ACCESS_TOKEN') || error.message.includes('Unauthorized')) {
      return res.status(500).json({
        error: 'Maps service configuration error',
        message: 'Location services temporarily unavailable',
        code: 'MAPBOX_CONFIG_ERROR'
      });
    }
    
    // Rate limiting errors
    if (error.message.includes('quota') || error.message.includes('rate limit')) {
      return res.status(429).json({
        error: 'Service temporarily busy',
        message: 'Please try again in a few minutes',
        code: 'RATE_LIMIT_ERROR'
      });
    }
    
    // Invalid city or location errors
    if (error.message.includes('geocoding') || error.message.includes('not found')) {
      return res.status(400).json({
        error: 'Invalid location',
        message: 'Unable to find the specified city. Please check the spelling and try again.',
        code: 'LOCATION_NOT_FOUND'
      });
    }
    
    // JSON parsing errors from AI response
    if (error.message.includes('JSON') || error.message.includes('parse')) {
      return res.status(500).json({
        error: 'Adventure generation error',
        message: 'Unable to create adventure. Please try again.',
        code: 'AI_RESPONSE_ERROR'
      });
    }
    
    // Network/timeout errors
    if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      return res.status(503).json({
        error: 'Service temporarily unavailable',
        message: 'Network connectivity issues. Please try again later.',
        code: 'NETWORK_ERROR'
      });
    }
    
    // Generic error fallback
    return res.status(500).json({
      error: 'Adventure generation failed',
      message: 'An unexpected error occurred. Please try again.',
      code: 'UNKNOWN_ERROR'
    });
  }
  
  /**
   * Validation middleware for adventure requests
   */
  function validateAdventureRequest(req, res, next) {
    const { city, radius, transportMode } = req.body;
    const errors = [];
    
    // Validate required fields
    if (!city || typeof city !== 'string' || city.trim().length === 0) {
      errors.push('City is required and must be a non-empty string');
    }
    
    if (!radius || (typeof radius !== 'number' && typeof radius !== 'string')) {
      errors.push('Radius is required and must be a number');
    } else {
      const radiusNum = typeof radius === 'string' ? parseFloat(radius) : radius;
      if (isNaN(radiusNum) || radiusNum <= 0 || radiusNum > 50) {
        errors.push('Radius must be between 1 and 50 kilometers');
      }
    }
    
    if (!transportMode || typeof transportMode !== 'string') {
      errors.push('Transport mode is required');
    } else {
      const validModes = ['walking', 'public transit', 'car/taxi'];
      if (!validModes.includes(transportMode)) {
        errors.push('Transport mode must be one of: walking, public transit, car/taxi');
      }
    }
    
    // Validate optional location if provided
    if (req.body.location) {
      const { location } = req.body;
      if (!location.latitude || !location.longitude) {
        errors.push('Location must include both latitude and longitude');
      } else {
        const lat = parseFloat(location.latitude);
        const lng = parseFloat(location.longitude);
        if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
          errors.push('Invalid latitude or longitude coordinates');
        }
      }
    }
    
    // Validate preferences if provided
    if (req.body.preferences && !Array.isArray(req.body.preferences)) {
      errors.push('Preferences must be an array');
    }
    
    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Please check your request parameters',
        details: errors,
        code: 'VALIDATION_ERROR'
      });
    }
    
    next();
  }
  
  /**
   * Rate limiting middleware (simple implementation)
   */
  const requestCounts = new Map();
  function simpleRateLimit(req, res, next) {
    const clientIP = req.ip || req.connection.remoteAddress;
    const currentTime = Date.now();
    const windowSize = 60 * 1000; // 1 minute
    const maxRequests = 10; // Max requests per minute
    
    // Clean up old entries
    for (const [ip, data] of requestCounts.entries()) {
      if (currentTime - data.firstRequest > windowSize) {
        requestCounts.delete(ip);
      }
    }
    
    // Check current client
    if (!requestCounts.has(clientIP)) {
      requestCounts.set(clientIP, {
        count: 1,
        firstRequest: currentTime
      });
    } else {
      const clientData = requestCounts.get(clientIP);
      if (currentTime - clientData.firstRequest < windowSize) {
        clientData.count++;
        if (clientData.count > maxRequests) {
          return res.status(429).json({
            error: 'Too many requests',
            message: 'Please wait a minute before making another request',
            code: 'RATE_LIMIT_EXCEEDED'
          });
        }
      } else {
        // Reset the window
        requestCounts.set(clientIP, {
          count: 1,
          firstRequest: currentTime
        });
      }
    }
    
    next();
  }
  
  module.exports = {
    adventureErrorHandler,
    validateAdventureRequest,
    simpleRateLimit
  };