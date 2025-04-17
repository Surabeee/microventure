const { getNearbyPlaces, geocodeAddress, validateItinerary } = require('./mapsService');

/**
 * Find suitable locations for an adventure
 * @param {Object} startLocation - Starting coordinates
 * @param {String} city - City name
 * @param {Number} durationHours - Available time in hours
 * @param {String} transportMode - Mode of transportation
 * @param {Array} preferences - User preferences for location types
 * @returns {Promise<Array>} Array of suitable locations
 */
async function findSuitableLocations(startLocation, city, durationHours, transportMode, preferences = []) {
  try {
    console.log(`Finding locations near: ${JSON.stringify(startLocation)} in ${city}`);
    
    // Convert hours to minutes
    const totalAvailableMinutes = durationHours * 60;
    
    // Calculate maximum travel radius based on transport mode
    let searchRadiusMeters;
    switch(transportMode) {
      case 'car/taxi':
        searchRadiusMeters = durationHours * 8000; // Roughly 8km per hour of available time
        break;
      case 'public transit':
        searchRadiusMeters = durationHours * 5000; // Roughly 5km per hour of available time
        break;
      case 'walking':
      default:
        searchRadiusMeters = durationHours * 2000; // Roughly 2km per hour of available time
    }
    
    // Ensure minimum search radius regardless of duration
    searchRadiusMeters = Math.max(searchRadiusMeters, 2000); // At least 2km
    
    // Cap the radius to reasonable values
    searchRadiusMeters = Math.min(searchRadiusMeters, 15000); // Max 15km
    
    console.log(`Using search radius of ${searchRadiusMeters} meters`);
    
    // Define high-quality place types based on preferences or default to a diverse mix
    let primaryPlaceTypes = [];
    let secondaryPlaceTypes = [];
    
    // Default set of place types (high priority)
    primaryPlaceTypes = [
      'tourist_attraction', 
      'museum', 
      'art_gallery',
      'landmark', 
      'park', 
      'historical_landmark'
    ];
    
    // Secondary set (medium priority)
    secondaryPlaceTypes = [
      'restaurant', 
      'cafe', 
      'shopping_mall', 
      'library',
      'church', 
      'mosque', 
      'hindu_temple',
      'zoo',
      'amusement_park'
    ];
    
    // Adjust types based on preferences if provided
    if (preferences && preferences.length > 0) {
      if (preferences.includes('food')) {
        primaryPlaceTypes.push('restaurant', 'cafe');
      }
      if (preferences.includes('culture')) {
        primaryPlaceTypes.push('art_gallery', 'museum');
      }
      if (preferences.includes('nature')) {
        primaryPlaceTypes.push('park', 'natural_feature');
      }
      if (preferences.includes('shopping')) {
        primaryPlaceTypes.push('shopping_mall', 'department_store');
      }
    }
    
    // Collect places from multiple types
    let allPlaces = [];
    
    // First try primary types
    for (const type of primaryPlaceTypes) {
      try {
        console.log(`Searching for places of type: ${type}`);
        const places = await getNearbyPlaces(startLocation, type, searchRadiusMeters);
        
        // Filter for places with ratings above 4.0 or with many reviews
        const highQualityPlaces = places.filter(place => 
          (place.rating && place.rating >= 4.0) || 
          (place.userRatingsTotal && place.userRatingsTotal > 50)
        );
        
        console.log(`Found ${highQualityPlaces.length} high-quality places of type ${type}`);
        allPlaces = [...allPlaces, ...highQualityPlaces];
      } catch (error) {
        console.error(`Error finding ${type} places:`, error);
      }
    }
    
    // If we don't have enough high-quality places, try secondary types
    if (allPlaces.length < 5) {
      for (const type of secondaryPlaceTypes) {
        try {
          console.log(`Searching for secondary places of type: ${type}`);
          const places = await getNearbyPlaces(startLocation, type, searchRadiusMeters);
          
          // Apply less strict filtering for secondary places
          const goodPlaces = places.filter(place => 
            (place.rating && place.rating >= 3.5) || 
            (place.userRatingsTotal && place.userRatingsTotal > 20)
          );
          
          console.log(`Found ${goodPlaces.length} good places of type ${type}`);
          allPlaces = [...allPlaces, ...goodPlaces];
          
          // Break if we have enough places
          if (allPlaces.length >= 10) break;
        } catch (error) {
          console.error(`Error finding ${type} places:`, error);
        }
      }
    }
    
    console.log(`Total places found before filtering: ${allPlaces.length}`);
    
    // If still no places found, try a more generic approach
    if (allPlaces.length === 0) {
      console.log("No places found with specific types, trying generic search");
      try {
        const genericPlaces = await getNearbyPlaces(startLocation, null, searchRadiusMeters);
        allPlaces = [...allPlaces, ...genericPlaces];
        console.log(`Found ${genericPlaces.length} places with generic search`);
      } catch (error) {
        console.error("Error with generic place search:", error);
      }
    }
    
    // Remove duplicates (by placeId)
    const uniquePlaces = Array.from(new Map(allPlaces.map(place => [place.placeId, place])).values());
    console.log(`Unique places after deduplication: ${uniquePlaces.length}`);
    
    // Sort by rating and limit to reasonable number (max 15)
    const candidatePlaces = uniquePlaces
      .sort((a, b) => ((b.rating || 0) - (a.rating || 0)))
      .slice(0, 15);
    
    console.log(`Final candidate places: ${candidatePlaces.length}`);
    
    if (candidatePlaces.length === 0) {
      throw new Error(`Could not find any interesting locations in ${city} near the provided coordinates`);
    }
    
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
