const { GoogleGenAI } = require("@google/genai");
const { findSuitableLocations, createOptimizedItinerary } = require('./locationService');
const { geocodeAddress } = require('./mapsService');

// Initialize the Gemini API
const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);

// Initialize the Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });


async function generateAdventure(city, duration, transportMode, location = null) {
  try {
    
    // Convert duration to a number if it's a string
    const durationHours = typeof duration === 'string' ? parseFloat(duration) : duration;
    
    // If we have user location, use it. Otherwise, geocode a central point in the city
    let startLocation;
    if (location) {
      startLocation = location;
    } else {
      try {
        const cityCenter = await geocodeAddress(city + " city center", city);
        startLocation = cityCenter;
      } catch (error) {
        console.error("Error geocoding city center:", error);
        throw new Error("Could not locate the city center");
      }
    }
    
    // Find suitable locations near the starting point
    const candidatePlaces = await findSuitableLocations(
      startLocation, 
      city, 
      durationHours, 
      transportMode
    );
    
    if (candidatePlaces.length === 0) {
      throw new Error("Could not find interesting locations in the area");
    }
    
    // Create an optimized itinerary
    const itinerary = await createOptimizedItinerary(
      startLocation,
      candidatePlaces,
      durationHours,
      transportMode
    );
    
    if (!itinerary.isValid) {
      throw new Error("Could not create a valid itinerary within the time constraints");
    }
    
    // Construct a prompt for Gemini to create a narrative
    const placesForPrompt = itinerary.stops.map((stop, index) => {
      if (index === 0) return `Starting point: ${stop.name}`;
      return `Stop ${index}: ${stop.name} (spending ${stop.timeToSpend} minutes)`;
    }).join("\n");
    
    const travelInfoForPrompt = itinerary.legs.map((leg, index) => {
      return `Travel from ${leg.origin} to ${leg.destination}: ${leg.travelTime} minutes by ${transportMode}`;
    }).join("\n");
    
    const prompt = `
    Create a micro-adventure in ${city} using the following pre-validated itinerary:
    
    IMPORTANT: This itinerary has been carefully validated to fit within ${durationHours} hours using ${transportMode} as the transportation mode.
    
    Locations:
    ${placesForPrompt}
    
    Travel times (already calculated accurately):
    ${travelInfoForPrompt}
    
    Total travel time: ${itinerary.totalTravelMinutes} minutes
    Total time at locations: ${itinerary.remainingMinutes} minutes
    
    Create a cohesive narrative journey connecting these specific locations. Do NOT add or remove any stops.
    
    For each location, provide:
    1. The name of the location (exactly as listed above)
    2. A brief description (2-3 sentences)
    3. What makes it special or unique
    4. How it connects to the overall narrative of the adventure
    5. The exact time to spend there as specified above
    
    Also include:
    - A compelling title for the adventure
    - A brief introduction to set the theme
    - A conclusion that ties the adventure together
    
    Format the response as a JSON object with the following structure:
    {
      "title": "Adventure Title",
      "introduction": "Brief introduction to the adventure theme",
      "stops": [
        {
          "name": "Location Name",
          "description": "Location description",
          "uniqueFeature": "What makes it special",
          "narrativeConnection": "How it connects to the story",
          "timeToSpend": The exact number of minutes to spend (e.g., 15),
          "travelTimeToNext": The exact travel time to next stop in minutes (e.g., 12),
          "completed": false
        }
      ],
      "transportMode": "${transportMode}",
      "totalDuration": "${durationHours} hours",
      "conclusion": "Adventure conclusion"
    }
    `;
    
    // Generate content
    // const result = await model.generateContent(prompt);
    const result = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
      });
    const text = result.text;
    
    // Extract JSON from the response
    const jsonMatch = text.match(/```json\n([\s\S]*)\n```/) || text.match(/({[\s\S]*})/);
    let parsedResponse;
    
    if (jsonMatch && jsonMatch[1]) {
      parsedResponse = JSON.parse(jsonMatch[1]);
    } else {
      try {
        parsedResponse = JSON.parse(text);
      } catch (e) {
        console.error("Failed to parse JSON from response", e);
        throw new Error("Failed to generate properly formatted adventure");
      }
    }

    // Add location data to each stop
    parsedResponse.stops.forEach((stop, index) => {
      // First stop is the starting point
      if (index === 0) {
        stop.location = startLocation;
      } else if (index <= itinerary.stops.length - 1) {
        // The rest of the stops come from the itinerary
        stop.location = itinerary.stops[index].location;
      }
      
      // Add travel info
      if (index < itinerary.legs.length) {
        // Use the actual travel times and distances from Google Maps
        stop.travelTimeToNext = itinerary.legs[index].travelTime;
        stop.distanceToNext = itinerary.legs[index].distance;
        stop.directionsToNext = itinerary.legs[index].steps;
      }
    });
    
    return parsedResponse;
  } catch (error) {
    console.error("Error generating adventure:", error);
    throw error;
  }
}

module.exports = { generateAdventure };