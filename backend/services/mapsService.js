const { Client } = require('@googlemaps/google-maps-services-js');
const NodeCache = require('node-cache');

// Initialize Google Maps client
const mapsClient = new Client({});

// Set up cache with 24-hour TTL
const cache = new NodeCache({ stdTTL: 86400 });

/**
 * Get travel time between two locations
 * @param {Object} origin - Origin coordinates {latitude, longitude}
 * @param {Object} destination - Destination coordinates {latitude, longitude}
 * @param {String} mode - Transportation mode (walking, transit, driving)
 * @returns {Promise<Object>} Travel time and distance information
 */
async function getTravelTime(origin, destination, mode = 'walking') {
  try {
    // Create a cache key based on parameters
    const cacheKey = `travel_${origin.latitude}_${origin.longitude}_${destination.latitude}_${destination.longitude}_${mode}`;
    
    // Check if we have a cached result
    const cachedResult = cache.get(cacheKey);
    if (cachedResult) {
      console.log('Using cached travel time data');
      return cachedResult;
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
    // Provide fallback estimation in case of failure
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
async function geocodeAddress(address, city) {
  try {
    const fullAddress = `${address}, ${city}`;
    const cacheKey = `geocode_${fullAddress}`;
    
    // Check cache first
    const cachedResult = cache.get(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }
    
    const response = await mapsClient.geocode({
      params: {
        address: fullAddress,
        key: process.env.GOOGLE_MAPS_API_KEY
      }
    });
    
    if (response.data.status === 'OK' && response.data.results.length > 0) {
      const location = response.data.results[0].geometry.location;
      const result = {
        latitude: location.lat,
        longitude: location.lng,
        formattedAddress: response.data.results[0].formatted_address
      };
      
      // Cache the result
      cache.set(cacheKey, result);
      
      return result;
    } else {
      throw new Error(`Geocoding request failed: ${response.data.status}`);
    }
  } catch (error) {
    console.error('Error geocoding address:', error);
    throw error;
  }
}

/**
 * Get places of interest near a location
 * @param {Object} location - Coordinates {latitude, longitude}
 * @param {String} type - Place type (e.g., 'tourist_attraction', 'museum')
 * @param {Number} radius - Search radius in meters
 * @returns {Promise<Array>} Array of places
 */
async function getNearbyPlaces(location, type, radius = 1000) {
  try {
    const cacheKey = `places_${location.latitude}_${location.longitude}_${type || 'generic'}_${radius}`;
    
    // Check cache first
    const cachedResult = cache.get(cacheKey);
    if (cachedResult) {
      console.log(`Using cached places data for ${type || 'generic'}`);
      return cachedResult;
    }
    
    // Prepare the request params
    const params = {
      location: `${location.latitude},${location.longitude}`,
      radius: radius,
      key: process.env.GOOGLE_MAPS_API_KEY
    };
    
    // Add type if specified
    if (type) {
      params.type = type;
    }
    
    console.log(`Making Places API request for ${type || 'generic'} with radius ${radius}m`);
    
    const response = await mapsClient.placesNearby({
      params: params
    });
    
    if (response.data.status === 'OK') {
      const places = response.data.results.map(place => ({
        placeId: place.place_id,
        name: place.name,
        address: place.vicinity,
        location: {
          latitude: place.geometry.location.lat,
          longitude: place.geometry.location.lng
        },
        types: place.types,
        rating: place.rating,
        userRatingsTotal: place.user_ratings_total
      }));
      
      // Cache the result
      cache.set(cacheKey, places);
      
      return places;
    } else {
      console.warn(`Places request returned status: ${response.data.status}`);
      
      // Handle ZERO_RESULTS differently than other error statuses
      if (response.data.status === 'ZERO_RESULTS') {
        return [];
      }
      
      throw new Error(`Places request failed: ${response.data.status}`);
    }
  } catch (error) {
    console.error('Error getting nearby places:', error);
    // Return empty array rather than throwing to allow the search to continue with other types
    return [];
  }
}

/**
 * Validates a multi-stop itinerary to ensure it fits within time constraints
 * @param {Array} stops - Array of locations with coordinates
 * @param {String} transportMode - Mode of transport
 * @param {Number} totalAvailableMinutes - Total time available in minutes
 * @returns {Promise<Object>} Validation result with timing information
 */
async function validateItinerary(stops, transportMode, totalAvailableMinutes) {
  try {
    let totalTravelMinutes = 0;
    const legs = [];
    
    // Calculate travel time between each stop
    for (let i = 0; i < stops.length - 1; i++) {
      const origin = stops[i].location;
      const destination = stops[i + 1].location;
      
      const travelInfo = await getTravelTime(origin, destination, transportMode);
      totalTravelMinutes += travelInfo.durationMinutes;
      
      legs.push({
        origin: stops[i].name,
        destination: stops[i + 1].name,
        travelTime: travelInfo.durationMinutes,
        travelTimeText: travelInfo.durationText,
        distance: travelInfo.distanceText,
        steps: travelInfo.steps
      });
    }
    
    // Calculate remaining time for activities
    const remainingMinutes = totalAvailableMinutes - totalTravelMinutes;
    const isValid = remainingMinutes >= stops.length * 10; // At least 10 mins per stop
    
    // Calculate recommended time per stop if valid
    let recommendedStopTimes = [];
    if (isValid) {
      // Distribute remaining time among stops
      // Give more time to stops marked as important
      const baseTimePerStop = Math.floor(remainingMinutes / stops.length);
      recommendedStopTimes = stops.map(stop => {
        return {
          name: stop.name,
          recommendedMinutes: baseTimePerStop
        };
      });
    }
    
    return {
      isValid,
      totalTravelMinutes,
      remainingMinutes,
      recommendedStopTimes,
      legs,
      transportMode
    };
  } catch (error) {
    console.error('Error validating itinerary:', error);
    throw error;
  }
}

/**
 * Fallback function to estimate distance between coordinates
 * @param {Object} origin - Origin coordinates
 * @param {Object} destination - Destination coordinates
 * @returns {Number} Estimated distance in meters
 */
function estimateDistance(origin, destination) {
  // Simple haversine formula for distance estimation
  const R = 6371e3; // Earth radius in meters
  const φ1 = origin.latitude * Math.PI/180;
  const φ2 = destination.latitude * Math.PI/180;
  const Δφ = (destination.latitude - origin.latitude) * Math.PI/180;
  const Δλ = (destination.longitude - origin.longitude) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  
  return R * c; // Distance in meters
}

/**
 * Fallback function to estimate travel time based on distance
 * @param {Object} origin - Origin coordinates
 * @param {Object} destination - Destination coordinates
 * @param {String} mode - Transportation mode
 * @returns {Number} Estimated travel time in minutes
 */
function estimateTravelTime(origin, destination, mode) {
  const distance = estimateDistance(origin, destination);
  let speedMetersPerMinute;
  
  // Approximate speeds by mode
  switch(mode) {
    case 'car/taxi':
      speedMetersPerMinute = 400; // ~24 km/h in city traffic
      break;
    case 'public transit':
      speedMetersPerMinute = 250; // ~15 km/h including wait times
      break;
    case 'walking':
    default:
      speedMetersPerMinute = 80; // ~4.8 km/h walking speed
  }
  
  return Math.ceil(distance / speedMetersPerMinute);
}

module.exports = {
  getTravelTime,
  geocodeAddress,
  getNearbyPlaces,
  validateItinerary
};