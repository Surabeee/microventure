const mbxClient = require('@mapbox/mapbox-sdk');
const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');
const mbxDirections = require('@mapbox/mapbox-sdk/services/directions');
const NodeCache = require('node-cache');
const axios = require('axios');

// Initialize Mapbox services
const baseClient = mbxClient({ accessToken: process.env.MAPBOX_ACCESS_TOKEN });
const geocodingService = mbxGeocoding(baseClient);
const directionsService = mbxDirections(baseClient);

// Cache for travel times and search results (cache for 1 hour)
const cache = new NodeCache({ stdTTL: 3600 });

/**
 * Geocode an address to get coordinates using Mapbox
 */
async function geocodeAddress(address) {
  try {
    const response = await geocodingService.forwardGeocode({
      query: address,
      limit: 1,
      types: ['place', 'locality', 'neighborhood']
    }).send();
    
    if (response.body.features && response.body.features.length > 0) {
      const feature = response.body.features[0];
      return {
        latitude: feature.center[1],
        longitude: feature.center[0],
        formattedAddress: feature.place_name
      };
    } else {
      throw new Error(`Geocoding failed: No results found for ${address}`);
    }
  } catch (error) {
    console.error('Error geocoding address:', error);
    throw error;
  }
}

/**
 * Get travel time between two locations using Mapbox
 */
async function getTravelTime(origin, destination, mode) {
  try {
    const cacheKey = `${origin.latitude},${origin.longitude}-${destination.latitude},${destination.longitude}-${mode}`;
    
    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Handle transit mode specially (Mapbox has limited transit)
    if (mode === 'public transit') {
      return await getTransitDirections(origin, destination);
    }
    
    // Convert mode to Mapbox profile
    const profile = getMapboxProfile(mode);
    
    const response = await directionsService.getDirections({
      profile: profile,
      waypoints: [
        { coordinates: [origin.longitude, origin.latitude] },
        { coordinates: [destination.longitude, destination.latitude] }
      ],
      geometries: 'geojson',
      steps: true
    }).send();
    
    if (response.body.routes && response.body.routes.length > 0) {
      const route = response.body.routes[0];
      
      const result = {
        distanceMeters: route.distance,
        distanceText: `${(route.distance / 1000).toFixed(1)} km`,
        durationSeconds: route.duration,
        durationMinutes: Math.ceil(route.duration / 60),
        durationText: formatDuration(route.duration),
        steps: route.legs[0].steps.map(step => ({
          distance: `${(step.distance / 1000).toFixed(1)} km`,
          duration: formatDuration(step.duration),
          instructions: step.maneuver.instruction,
          travelMode: mode
        }))
      };
      
      // Cache the result
      cache.set(cacheKey, result);
      
      return result;
    } else {
      throw new Error('No route found');
    }
  } catch (error) {
    console.error('Error getting travel time:', error);
    // Fallback estimation
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
 * Search for places using Mapbox Search Box API with radius
 */
async function searchPlaces(location, type, city, radius = 5000) {
  try {
    const cacheKey = `places-${location.latitude},${location.longitude}-${type}-${radius}`;
    
    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Convert preference type to search query
    const searchQuery = getSearchQuery(type, city);
    
    // Use Mapbox Search Box API for POI search
    const response = await axios.get('https://api.mapbox.com/search/searchbox/v1/suggest', {
      params: {
        q: searchQuery,
        access_token: process.env.MAPBOX_ACCESS_TOKEN,
        session_token: generateSessionToken(),
        proximity: `${location.longitude},${location.latitude}`,
        bbox: getBoundingBox(location, radius),
        limit: 10,
        types: 'poi',
        language: 'en'
      }
    });
    
    if (response.data && response.data.suggestions) {
      const places = [];
      
      // Get detailed info for each suggestion
      for (const suggestion of response.data.suggestions.slice(0, 5)) {
        try {
          const details = await retrievePlaceDetails(suggestion.mapbox_id);
          if (details && isQualityPlace(details)) {
            places.push(details);
          }
        } catch (error) {
          console.error('Error retrieving place details:', error);
        }
      }
      
      // Cache the results
      cache.set(cacheKey, places);
      
      return places;
    }
    
    return [];
  } catch (error) {
    console.error(`Error searching for ${type} places:`, error);
    return [];
  }
}

/**
 * Create bounding box for radius search
 */
function getBoundingBox(center, radiusMeters) {
  const latDelta = radiusMeters / 111000; // Rough conversion: 1 degree ≈ 111km
  const lngDelta = radiusMeters / (111000 * Math.cos(center.latitude * Math.PI / 180));
  
  const south = center.latitude - latDelta;
  const west = center.longitude - lngDelta;
  const north = center.latitude + latDelta;
  const east = center.longitude + lngDelta;
  
  return `${west},${south},${east},${north}`;
}

/**
 * Filter out low-quality places
 */
function isQualityPlace(place) {
  const badKeywords = ['police', 'station', 'factory', 'industrial', 'office', 'warehouse', 'hospital'];
  const name = place.name.toLowerCase();
  
  // Reject places with bad keywords
  if (badKeywords.some(keyword => name.includes(keyword))) {
    return false;
  }
  
  // Keep places with decent rating
  if (place.rating && place.rating < 3.5) {
    return false;
  }
  
  return true;
}

/**
 * Retrieve detailed place information using Mapbox Search Box API
 */
async function retrievePlaceDetails(mapboxId) {
  try {
    const response = await axios.get('https://api.mapbox.com/search/searchbox/v1/retrieve/' + mapboxId, {
      params: {
        access_token: process.env.MAPBOX_ACCESS_TOKEN,
        session_token: generateSessionToken()
      }
    });
    
    if (response.data && response.data.features && response.data.features.length > 0) {
      const feature = response.data.features[0];
      
      return {
        name: feature.properties.name || 'Unnamed Location',
        location: {
          latitude: feature.geometry.coordinates[1],
          longitude: feature.geometry.coordinates[0]
        },
        rating: feature.properties.rating || 4.0,
        types: feature.properties.category ? [feature.properties.category] : ['point_of_interest'],
        vicinity: feature.properties.full_address || feature.properties.place_formatted,
        place_id: feature.properties.mapbox_id
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error retrieving place details:', error);
    return null;
  }
}

/**
 * Handle transit routing (fallback to walking + estimation)
 */
async function getTransitDirections(origin, destination) {
  try {
    // Get walking directions as baseline
    const walkingResult = await getTravelTime(origin, destination, 'walking');
    
    // Estimate transit time (usually 40-60% of walking time for good transit)
    const transitMultiplier = 0.5;
    const estimatedTransitMinutes = Math.ceil(walkingResult.durationMinutes * transitMultiplier);
    
    return {
      distanceMeters: walkingResult.distanceMeters,
      distanceText: walkingResult.distanceText,
      durationSeconds: estimatedTransitMinutes * 60,
      durationMinutes: estimatedTransitMinutes,
      durationText: formatDuration(estimatedTransitMinutes * 60),
      isEstimation: true,
      note: 'Transit time estimated based on walking route'
    };
  } catch (error) {
    console.error('Error getting transit directions:', error);
    return {
      distanceMeters: estimateDistance(origin, destination),
      distanceText: 'Estimation',
      durationMinutes: estimateTravelTime(origin, destination, 'public transit'),
      durationText: 'Estimation',
      isEstimation: true
    };
  }
}

/**
 * Convert preference type to search query for Mapbox
 */
function getSearchQuery(type, city) {
  const queryMapping = {
    'museum': `museums in ${city}`,
    'park': `parks in ${city}`,
    'point_of_interest': `attractions in ${city}`,
    'restaurant': `restaurants in ${city}`,
    'shopping_mall': `shopping in ${city}`,
    'amusement_park': `entertainment in ${city}`,
    'tourist_attraction': `tourist attractions in ${city}`
  };
  
  return queryMapping[type] || `${type} in ${city}`;
}

/**
 * Convert transport mode to Mapbox profile
 */
function getMapboxProfile(mode) {
  const profiles = {
    'walking': 'mapbox/walking',
    'car/taxi': 'mapbox/driving-traffic',
    'driving': 'mapbox/driving-traffic',
    'cycling': 'mapbox/cycling'
  };
  
  return profiles[mode] || 'mapbox/walking';
}

/**
 * Generate a session token for Mapbox Search Box API
 */
function generateSessionToken() {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Format duration in seconds to human readable string
 */
function formatDuration(seconds) {
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
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

  return R * c;
}

/**
 * Estimate travel time based on distance and mode
 */
function estimateTravelTime(origin, destination, mode) {
  const distance = estimateDistance(origin, destination);
  const distanceKm = distance / 1000;
  
  const speeds = {
    'walking': 5,
    'public transit': 20,
    'car/taxi': 30,
    'cycling': 15
  };
  
  const speed = speeds[mode] || 5;
  return Math.ceil((distanceKm / speed) * 60);
}

module.exports = {
  geocodeAddress,
  getTravelTime,
  searchPlaces,
  estimateDistance,
  estimateTravelTime
};