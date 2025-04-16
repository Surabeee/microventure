const { getNearbyPlaces, geocodeAddress, validateItinerary } = require('./mapsService');

/**
 * Find suitable locations for an adventure
 * @param {Object} startLocation - Starting coordinates
 * @param {String} city - City name
 * @param {Number} durationHours - Available time in hours
 * @param {String} transportMode - Mode of transportation
 * @returns {Promise<Array>} Array of suitable locations
 */
async function findSuitableLocations(startLocation, city, durationHours, transportMode) {
  try {
    // Convert hours to minutes
    const totalAvailableMinutes = durationHours * 60;
    
    // Calculate maximum travel radius based on transport mode
    let searchRadiusMeters;
    switch(transportMode) {
      case 'car/taxi':
        searchRadiusMeters = durationHours * 5000; // Roughly 5km per hour of available time
        break;
      case 'public transit':
        searchRadiusMeters = durationHours * 3000; // Roughly 3km per hour of available time
        break;
      case 'walking':
      default:
        searchRadiusMeters = durationHours * 1500; // Roughly 1.5km per hour of available time
    }
    
    // Cap the radius to reasonable values
    searchRadiusMeters = Math.min(searchRadiusMeters, 10000); // Max 10km
    
    // Find places of interest near the starting location
    const placeTypes = ['tourist_attraction', 'museum', 'park', 'historic', 'point_of_interest'];
    
    // Collect places from multiple types
    let allPlaces = [];
    for (const type of placeTypes) {
      const places = await getNearbyPlaces(startLocation, type, searchRadiusMeters);
      allPlaces = [...allPlaces, ...places];
    }
    
    // Remove duplicates (by placeId)
    const uniquePlaces = Array.from(new Map(allPlaces.map(place => [place.placeId, place])).values());
    
    // Sort by rating and limit to reasonable number (max 10)
    const candidatePlaces = uniquePlaces
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 10);
    
    return candidatePlaces;
  } catch (error) {
    console.error('Error finding suitable locations:', error);
    throw error;
  }
}

/**
 * Create an optimized itinerary
 * @param {Object} startLocation - Starting coordinates
 * @param {Array} candidatePlaces - Array of potential places to visit
 * @param {Number} durationHours - Available time in hours
 * @param {String} transportMode - Mode of transportation
 * @returns {Promise<Object>} Optimized itinerary
 */
async function createOptimizedItinerary(startLocation, candidatePlaces, durationHours, transportMode) {
  try {
    const totalAvailableMinutes = durationHours * 60;
    const startingPoint = {
      name: "Starting Point",
      location: startLocation
    };
    
    // Determine optimal number of stops based on duration
    // For a 2-hour adventure walking, 3-4 stops is reasonable
    let targetNumberOfStops;
    if (durationHours <= 1) {
      targetNumberOfStops = 2;
    } else if (durationHours <= 3) {
      targetNumberOfStops = 3;
    } else if (durationHours <= 5) {
      targetNumberOfStops = 4;
    } else {
      targetNumberOfStops = 5;
    }
    
    // Simple greedy algorithm to select stops
    // Start with nearest places and add more if time permits
    const selectedStops = [startingPoint];
    
    // Sort places by distance from starting point (this is an approximation)
    const sortedPlaces = [...candidatePlaces].sort((a, b) => {
      const distA = calculateDistance(startLocation, a.location);
      const distB = calculateDistance(startLocation, b.location);
      return distA - distB;
    });
    
    // Try to build an itinerary with the ideal number of stops
    for (let i = 0; i < sortedPlaces.length && selectedStops.length < targetNumberOfStops + 1; i++) {
      selectedStops.push(sortedPlaces[i]);
      
      // Validate the current itinerary
      const validation = await validateItinerary(selectedStops, transportMode, totalAvailableMinutes);
      
      // If not valid, remove the last added stop
      if (!validation.isValid) {
        selectedStops.pop();
      }
    }
    
    // Final validation
    const finalValidation = await validateItinerary(selectedStops, transportMode, totalAvailableMinutes);
    
    // Calculate time allocation
    const timeAllocation = allocateTime(
      selectedStops, 
      finalValidation.legs, 
      totalAvailableMinutes
    );
    
    return {
      stops: timeAllocation.stops,
      legs: finalValidation.legs,
      totalTravelMinutes: finalValidation.totalTravelMinutes,
      remainingMinutes: finalValidation.remainingMinutes,
      isValid: finalValidation.isValid,
      transportMode
    };
  } catch (error) {
    console.error('Error creating optimized itinerary:', error);
    throw error;
  }
}

/**
 * Helper function to calculate straight-line distance
 * @param {Object} point1 - First point coordinates
 * @param {Object} point2 - Second point coordinates
 * @returns {Number} Distance in an arbitrary unit (for comparison only)
 */
function calculateDistance(point1, point2) {
  return Math.sqrt(
    Math.pow(point2.latitude - point1.latitude, 2) + 
    Math.pow(point2.longitude - point1.longitude, 2)
  );
}

/**
 * Allocate time for each stop based on available time
 * @param {Array} stops - Array of stops
 * @param {Array} legs - Array of journey legs between stops
 * @param {Number} totalAvailableMinutes - Total available time
 * @returns {Object} Stops with allocated time
 */
function allocateTime(stops, legs, totalAvailableMinutes) {
  // Calculate total travel time
  const totalTravelMinutes = legs.reduce((sum, leg) => sum + leg.travelTime, 0);
  
  // Calculate remaining time for stops
  const remainingMinutes = totalAvailableMinutes - totalTravelMinutes;
  
  // Minimum time per stop
  const minTimePerStop = 10;
  
  // Number of stops
  const numStops = stops.length;
  
  // Check if we have enough time for minimum allocation
  if (remainingMinutes < numStops * minTimePerStop) {
    // Not enough time - allocate minimum time to each stop
    stops.forEach((stop, index) => {
      stop.timeToSpend = minTimePerStop;
      if (index < legs.length) {
        stop.travelTimeToNext = legs[index].travelTime;
      }
    });
  } else {
    // Distribute time proportionally
    // Give more time to middle stops, less to first and last
    const stopWeights = stops.map((stop, index) => {
      if (index === 0) return 0.5; // Starting point
      if (index === numStops - 1) return 1.0; // Last stop
      return 1.2; // Middle stops get more time
    });
    
    const totalWeight = stopWeights.reduce((sum, weight) => sum + weight, 0);
    const timePerWeight = (remainingMinutes - numStops * minTimePerStop) / totalWeight;
    
    stops.forEach((stop, index) => {
      // Base time plus weighted additional time
      stop.timeToSpend = Math.round(minTimePerStop + stopWeights[index] * timePerWeight);
      
      // Add travel time to next stop (if not the last stop)
      if (index < legs.length) {
        stop.travelTimeToNext = legs[index].travelTime;
      }
    });
  }
  
  return { stops, totalTravelMinutes, remainingMinutes };
}

module.exports = {
  findSuitableLocations,
  createOptimizedItinerary
};
