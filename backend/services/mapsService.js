const { Client } = require('@googlemaps/google-maps-services-js');
const NodeCache = require('node-cache');

// Create Maps client
const mapsClient = new Client({});

// Cache for travel times (cache for 1 hour)
const cache = new NodeCache({ stdTTL: 3600 });

/**
 * Get travel time between two locations
 * @param {Object} origin - Origin coordinates {latitude, longitude}
 * @param {Object} destination - Destination coordinates {latitude, longitude}
 * @param {String} mode - Travel mode (walking, public transit, car/taxi)
 * @returns {Promise<Object>} Travel information
 */
async function getTravelTime(origin, destination, mode) {
  try {
    // Create cache key
    const cacheKey = `${origin.latitude},${origin.longitude}-${destination.latitude},${destination.longitude}-${mode}`;
    
    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Convert mode to Google Maps format
    const travelMode = mode === 'car/taxi' ? 'driving' : 
                      mode === 'public transit' ? 'transit' : 'walking';
    
    // Make request to Google Maps Directions API
    const response = await mapsClient.directions({
      params: {
        origin: `${origin.latitude},${origin.longitude}`,
        destination: `${destination.latitude},${destination.longitude}`,
        mode: travelMode,
        key: process.env.GOOGLE_MAPS_API_KEY
      }
    });
    
    // Process the response
    if (response.data.status === 'OK' && response.data.routes.length > 0) {
      const route = response.data.routes[0];
      const leg = route.legs[0];
      
      const result = {
        distanceMeters: leg.distance.value,
        distanceText: leg.distance.text,
        durationSeconds: leg.duration.value,
        durationMinutes: Math.ceil(leg.duration.value / 60),
        durationText: leg.duration.text,
        startAddress: leg.start_address,
        endAddress: leg.end_address,
        steps: leg.steps.map(step => ({
          distance: step.distance.text,
          duration: step.duration.text,
          instructions: step.html_instructions,
          travelMode: step.travel_mode
        }))
      };
      
      // Cache the result
      cache.set(cacheKey, result);
      
      return result;
    } else {
      throw new Error(`Directions request failed: ${response.data.status}`);
    }
  } catch (error) {
    console.error('Error getting travel time:', error);
    // Provide fallback estimation
    return {
      distanceMeters: estimateDistance(origin, destination),
      distanceText: 'Estimation',
      durationMinutes: estimateTravelTime(origin, destination, mode),
      durationText: 'Estimation',
      isEstimation: true
    };
  }
}

/**
 * Geocode an address to get coordinates
 * @param {String} address - Address to geocode
 * @returns {Promise<Object>} Coordinates {latitude, longitude}
 */
async function geocodeAddress(address) {
  try {
    const response = await mapsClient.geocode({
      params: {
        address: address,
        key: process.env.GOOGLE_MAPS_API_KEY
      }
    });
    
    if (response.data.status === 'OK' && response.data.results.length > 0) {
      const location = response.data.results[0].geometry.location;
      return {
        latitude: location.lat,
        longitude: location.lng,
        formattedAddress: response.data.results[0].formatted_address
      };
    } else {
      throw new Error(`Geocoding failed: ${response.data.status}`);
    }
  } catch (error) {
    console.error('Error geocoding address:', error);
    throw error;
  }
}

/**
 * Estimate distance between two points (Haversine formula)
 */
function estimateDistance(origin, destination) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = origin.latitude * Math.PI/180;
  const φ2 = destination.latitude * Math.PI/180;
  const Δφ = (destination.latitude-origin.latitude) * Math.PI/180;
  const Δλ = (destination.longitude-origin.longitude) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
}

/**
 * Estimate travel time based on distance and mode
 */
function estimateTravelTime(origin, destination, mode) {
  const distance = estimateDistance(origin, destination);
  const distanceKm = distance / 1000;
  
  // Rough speed estimates
  const speeds = {
    'walking': 5, // km/h
    'public transit': 20, // km/h
    'car/taxi': 30 // km/h (city driving)
  };
  
  const speed = speeds[mode] || 5;
  return Math.ceil((distanceKm / speed) * 60); // Convert to minutes
}

module.exports = {
  getTravelTime,
  geocodeAddress,
  estimateDistance,
  estimateTravelTime
};