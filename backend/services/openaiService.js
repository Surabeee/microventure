const OpenAI = require('openai');
const { geocodeAddress, validateItinerary } = require('./mapsService');

// Initialize OpenAI client
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Generate an adventure using OpenAI with web search capability
 * @param {string} city - City name
 * @param {number} duration - Duration in hours
 * @param {string} transportMode - Mode of transport (walking, public transit, car/taxi)
 * @param {Object} location - User's starting location {latitude, longitude}
 * @param {Array} preferences - User preferences for location types
 * @returns {Promise<Object>} Adventure object with narrative and stops
 */
async function generateAdventureWithWebSearch(city, duration, transportMode, location, preferences = []) {
  try {
    console.log(process.env.GOOGLE_MAPS_API_KEY)
    // Format the user location for search context
    const startLocation = location || null;
    
    // Create search context to help narrow down results
    let searchContext = {};
    
    // If we have location data, format it for OpenAI
    if (startLocation) {
      // We'll determine country, city, region later if needed
      // For now, just use the coordinates for search
    }
    
    // Create a detailed prompt for the web search
    const input = createSearchPrompt(city, duration, transportMode, startLocation, preferences);
    
    // Call OpenAI with web search enabled
    const response = await client.responses.create({
      model: "gpt-4o-mini-search-preview", // Using a compatible model that supports web search
      tools: [{
        type: "web_search_preview",
        search_context_size: "medium" // Balanced context and cost
      }],
      input: input
    });
    
    // Extract the response text
    const responseText = response.output_text;
    
    // Parse the JSON adventure from the response
    const adventure = parseAdventureResponse(responseText);
    
    // Process and validate the adventure
    return processAndValidateAdventure(adventure, startLocation, city, duration, transportMode);
  } catch (error) {
    console.error('Error generating adventure with OpenAI:', error);
    throw error;
  }
}

/**
 * Create a detailed prompt for the OpenAI web search
 */
function createSearchPrompt(city, duration, transportMode, startLocation, preferences = []) {
  // Convert preferences array to a string description
  const preferencesText = preferences.length > 0 
    ? `Places should focus on these interests: ${preferences.join(', ')}.`
    : 'Include a diverse mix of interesting places.';
  
  // Format location information for the prompt
  const locationText = startLocation 
    ? `The adventure starts at coordinates: ${startLocation.latitude}, ${startLocation.longitude}. Find nearby attractions in ${city} from this specific point.`
    : `The adventure takes place in ${city}.`;
  
  return `
I need to create a "${duration}-hour" micro-adventure in ${city} using "${transportMode}" as the transportation mode. ${locationText}

${preferencesText}

SEARCH TASK 1: Find 4-6 highly-rated, interesting locations in ${city} that would make an engaging ${duration}-hour adventure. Focus on places with ratings above 4.0 stars if possible. Include tourist attractions, museums, parks, historical sites, and unique local experiences.

SEARCH TASK 2: For each location, find specific details about:
- Exact name of the location
- Precise address or coordinates 
- What makes it special or unique (historical significance, architectural features, local stories)
- Approximate visit duration recommendation
- Typical ratings/reviews

SEARCH TASK 3: Find real-time information about travel times between these locations using ${transportMode} mode.

After gathering this information, create a cohesive narrative adventure with these elements:

1. A compelling title for the adventure
2. Brief introduction setting the mood/theme (2-3 sentences)
3. A list of 3-5 stops based on the real places you found, including:
   - Exact name of the location
   - Rich description with specific details that make it interesting
   - A highlight of one unique feature of the location
   - How this location connects to the overall narrative/theme
   - Specific time allocation for the stop (in minutes)
   - Travel time to the next stop (in minutes)
   - Coordinates or precise location information

4. A brief conclusion that wraps up the adventure (1-2 sentences)

The total adventure time must fit within ${duration} hours including travel time between locations.

Return ONLY a correctly formatted JSON object with this structure:
{
  "title": "Adventure Title",
  "introduction": "Introduction text",
  "stops": [
    {
      "name": "Stop Name",
      "description": "Detailed description with real facts",
      "uniqueFeature": "What makes it special",
      "narrativeConnection": "How it connects to the journey",
      "timeToSpend": minutes_as_number,
      "travelTimeToNext": minutes_as_number,
      "location": {
        "latitude": latitude_as_number,
        "longitude": longitude_as_number
      },
      "completed": false
    }
  ],
  "transportMode": "${transportMode}",
  "totalDuration": "${duration} hours",
  "conclusion": "Concluding text"
}
`;
}

/**
 * Parse the adventure JSON from the OpenAI response
 */
function parseAdventureResponse(responseText) {
  try {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = responseText.match(/```(?:json)?([\s\S]*?)```/) || 
                      responseText.match(/({[\s\S]*})/);
    
    if (jsonMatch && jsonMatch[1]) {
      // Trim the extracted content to remove any extra whitespace
      const jsonContent = jsonMatch[1].trim();
      return JSON.parse(jsonContent);
    }
    
    // If no code blocks, try parsing the whole response as JSON
    return JSON.parse(responseText);
  } catch (error) {
    console.error('Error parsing adventure response:', error);
    console.error('Response text:', responseText);
    throw new Error('Failed to parse adventure data from AI response');
  }
}

/**
 * Process and validate the adventure data
 */
async function processAndValidateAdventure(adventure, startLocation, city, duration, transportMode) {
  try {
    // Ensure the adventure object has the correct structure
    if (!adventure.stops || !Array.isArray(adventure.stops) || adventure.stops.length === 0) {
      throw new Error('Invalid adventure format: missing stops array');
    }
    
    // Validate locations and geocode any that are missing coordinates
    for (let i = 0; i < adventure.stops.length; i++) {
      const stop = adventure.stops[i];
      
      // First stop should use the provided start location if available
      if (i === 0 && startLocation) {
        stop.location = startLocation;
        continue;
      }
      
      // Geocode the location if coordinates aren't provided
      if (!stop.location || !stop.location.latitude || !stop.location.longitude) {
        try {
          const geocoded = await geocodeAddress(`${stop.name}, ${city}`);
          stop.location = {
            latitude: geocoded.latitude,
            longitude: geocoded.longitude
          };
        } catch (geocodeError) {
          console.warn(`Could not geocode location for ${stop.name}:`, geocodeError);
          // Assign approximate coordinates if geocoding fails
          if (i > 0 && adventure.stops[i-1].location) {
            // Use previous stop's location with a small offset
            const prevLocation = adventure.stops[i-1].location;
            stop.location = {
              latitude: prevLocation.latitude + (Math.random() * 0.01 - 0.005),
              longitude: prevLocation.longitude + (Math.random() * 0.01 - 0.005)
            };
          } else {
            throw new Error(`Could not determine location for stop: ${stop.name}`);
          }
        }
      }
      
      // Ensure numeric fields are actually numbers
      stop.timeToSpend = Number(stop.timeToSpend) || 30;
      stop.travelTimeToNext = Number(stop.travelTimeToNext) || 15;
      stop.completed = false;
    }
    
    // Calculate total minutes for the adventure
    const durationHours = parseFloat(duration);
    const totalAvailableMinutes = durationHours * 60;
    
    // Create an array of just the locations for validation
    const stopLocations = adventure.stops.map(stop => ({
      name: stop.name,
      location: stop.location
    }));
    
    // Validate the itinerary with Google Maps
    try {
      const validation = await validateItinerary(stopLocations, transportMode, totalAvailableMinutes);
      
      // Update travel times with actual data from Google Maps
      adventure.stops.forEach((stop, index) => {
        if (index < validation.legs.length) {
          stop.travelTimeToNext = validation.legs[index].travelTime;
          stop.distanceToNext = validation.legs[index].distance;
          stop.directionsToNext = validation.legs[index].steps;
        }
      });
      
      // If validation shows the itinerary takes too long, adjust time allocations
      if (!validation.isValid) {
        console.log('Itinerary validation failed, adjusting time allocations');
        
        // Calculate total time currently allocated to stops
        let totalStopTime = adventure.stops.reduce((sum, stop) => sum + stop.timeToSpend, 0);
        
        // Calculate available time for stops after accounting for travel
        const availableForStops = totalAvailableMinutes - validation.totalTravelMinutes;
        
        // If we need to reduce time at stops
        if (totalStopTime > availableForStops) {
          const reductionFactor = availableForStops / totalStopTime;
          
          // Scale down each stop's time
          adventure.stops.forEach(stop => {
            stop.timeToSpend = Math.max(10, Math.floor(stop.timeToSpend * reductionFactor));
          });
        }
      }
    } catch (validationError) {
      console.warn('Could not validate itinerary with Google Maps:', validationError);
      // Continue with the adventure, but log the validation failure
    }
    
    return adventure;
  } catch (error) {
    console.error('Error processing adventure:', error);
    throw error;
  }
}

module.exports = {
  generateAdventureWithWebSearch
};