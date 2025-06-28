const { GoogleGenerativeAI } = require("@google/generative-ai");
const { geocodeAddress, getTravelTime, searchPlaces } = require('./mapboxService');

// Initialize the Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function generateAdventure(city, radius, transportMode, location = null, preferences = []) {
  try {
    console.log(`🚀 Starting adventure generation for ${city} (${radius}km radius)`);
    
    const radiusMeters = radius * 1000; // Convert km to meters
    
    // Step 1: Find real locations in the radius
    const locations = await findRealLocations(city, radiusMeters, preferences, location);
    console.log(`📍 Found ${locations.length} potential locations`);
    
    // Step 2: Get user's starting location or use city center
    const startLocation = location || await getCityCenter(city);
    console.log(`🏠 Starting location: ${startLocation.latitude}, ${startLocation.longitude}`);
    
    // Step 3: Create optimized itinerary
    const itinerary = await createOptimizedItinerary(locations, startLocation, radiusMeters, transportMode);
    console.log(`🗺️ Created itinerary with ${itinerary.stops.length} stops`);
    
    // Step 4: Generate narrative using Gemini AI
    const adventure = await generateNarrativeWithGemini(itinerary, city, radius, transportMode, startLocation);
    console.log(`✨ Generated adventure narrative`);
    
    return adventure;
    
  } catch (error) {
    console.error('❌ Error generating adventure:', error);
    throw new Error(`Failed to generate adventure: ${error.message}`);
  }
}

async function findRealLocations(city, radiusMeters, preferences = [], userLocation = null) {
  try {
    // Use user location if provided, otherwise city center
    const searchCenter = userLocation || await geocodeAddress(city);
    
    const searchTypes = getSearchTypes(preferences);
    const locations = [];
    
    // Search for each type of place using Mapbox within radius
    for (const type of searchTypes) {
      const places = await searchPlaces(searchCenter, type, city, radiusMeters);
      locations.push(...places);
    }
    
    const uniqueLocations = removeDuplicates(locations);
    const highRatedLocations = uniqueLocations.filter(loc => loc.rating >= 3.5);
    
    return highRatedLocations.slice(0, 10);
    
  } catch (error) {
    console.error('Error finding real locations:', error);
    return getDefaultLocations(city);
  }
}

async function getCityCenter(city) {
  try {
    return await geocodeAddress(city);
  } catch (error) {
    console.error('Error getting city center:', error);
    return { latitude: 40.7128, longitude: -74.0060 };
  }
}

async function createOptimizedItinerary(locations, startLocation, radiusMeters, transportMode) {
  try {
    // Select 4-6 locations based on variety and travel efficiency
    const maxStops = Math.min(locations.length, 5);
    const selectedLocations = locations.slice(0, maxStops);
    
    const stopsWithTravelTime = [];
    let totalTravelTime = 0;
    
    for (let i = 0; i < selectedLocations.length; i++) {
      const currentLocation = i === 0 ? startLocation : selectedLocations[i - 1].location;
      const nextLocation = selectedLocations[i].location;
      
      try {
        // Using Mapbox for travel time calculation
        const travelInfo = await getTravelTime(currentLocation, nextLocation, transportMode);
        const travelMinutes = travelInfo.durationMinutes || 10;
        
        stopsWithTravelTime.push({
          ...selectedLocations[i],
          travelTimeToNext: i === selectedLocations.length - 1 ? 0 : travelMinutes,
          suggestedTime: "30-45 minutes"
        });
        
        totalTravelTime += travelMinutes;
      } catch (error) {
        console.error('Error calculating travel time:', error);
        stopsWithTravelTime.push({
          ...selectedLocations[i],
          travelTimeToNext: i === selectedLocations.length - 1 ? 0 : 10,
          suggestedTime: "30-45 minutes"
        });
        totalTravelTime += 10;
      }
    }
    
    const estimatedLocationTime = selectedLocations.length * 35; // Average 35 min per stop
    const totalEstimatedTime = totalTravelTime + estimatedLocationTime;
    
    return {
      stops: stopsWithTravelTime,
      totalTravelMinutes: totalTravelTime,
      totalLocationMinutes: estimatedLocationTime,
      estimatedTotalMinutes: totalEstimatedTime
    };
    
  } catch (error) {
    console.error('Error creating itinerary:', error);
    throw error;
  }
}

async function generateNarrativeWithGemini(itinerary, city, radius, transportMode, startLocation) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const placesForPrompt = itinerary.stops.map((stop, index) => 
      `${index + 1}. ${stop.name} (${stop.types ? stop.types.join(', ') : 'attraction'}) - ${stop.vicinity || 'in ' + city}`
    ).join('\n');
    
    const estimatedHours = Math.ceil(itinerary.estimatedTotalMinutes / 60);
    const timeRange = `${Math.max(estimatedHours - 1, 2)}-${estimatedHours + 1}`;
    
    const prompt = `
Create an engaging micro-adventure in ${city} within ${radius}km radius using ${transportMode} as transportation.

Real locations to include:
${placesForPrompt}

Create a cohesive narrative journey connecting these EXACT locations. Do NOT invent places.

For each location, provide:
1. The exact name (as listed above)
2. A vivid description (2-3 sentences) 
3. What makes it special/unique
4. How it connects to the adventure story
5. Use "30-45 minutes" as suggested time

Also include:
- An engaging title for the adventure
- A brief introduction setting the mood
- A conclusion that ties everything together

Format as JSON:
{
  "title": "Adventure Title",
  "introduction": "Brief introduction text",
  "stops": [
    {
      "name": "Exact Location Name",
      "description": "Vivid description",
      "uniqueFeature": "What makes it special",
      "narrativeConnection": "How it connects to the story",
      "suggestedTime": "30-45 minutes",
      "travelTimeToNext": 0,
      "completed": false
    }
  ],
  "transportMode": "${transportMode}",
  "estimatedDuration": "${timeRange} hours",
  "searchRadius": "${radius}km",
  "conclusion": "Adventure conclusion"
}
`;
    
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    let parsedResponse;
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/({[\s\S]*})/);
    
    if (jsonMatch && jsonMatch[1]) {
      parsedResponse = JSON.parse(jsonMatch[1]);
    } else {
      parsedResponse = JSON.parse(text);
    }
    
    // Add location data to each stop
    parsedResponse.stops.forEach((stop, index) => {
      if (index === 0) {
        stop.location = startLocation;
      } else if (index <= itinerary.stops.length) {
        stop.location = itinerary.stops[index - 1]?.location || startLocation;
      }
    });
    
    return parsedResponse;
    
  } catch (error) {
    console.error('Error generating narrative with Gemini:', error);
    return createFallbackAdventure(itinerary, city, radius, transportMode, startLocation);
  }
}

function getSearchTypes(preferences) {
  const typeMapping = {
    'museums': 'museum',
    'parks': 'park',
    'historical': 'point_of_interest',
    'food': 'restaurant',
    'shopping': 'shopping_mall',
    'entertainment': 'amusement_park',
    'cultural': 'tourist_attraction',
    'nature': 'park'
  };
  
  if (preferences.length === 0) {
    return ['tourist_attraction', 'museum', 'park', 'point_of_interest'];
  }
  
  return preferences.map(pref => typeMapping[pref] || 'tourist_attraction');
}

function removeDuplicates(locations) {
  const seen = new Set();
  return locations.filter(location => {
    const key = `${location.name}-${location.location.latitude}-${location.location.longitude}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function createFallbackAdventure(itinerary, city, radius, transportMode, startLocation) {
  const estimatedHours = Math.ceil(itinerary.estimatedTotalMinutes / 60);
  const timeRange = `${Math.max(estimatedHours - 1, 2)}-${estimatedHours + 1}`;
  
  return {
    title: `Discover ${city} - ${radius}km Adventure`,
    introduction: `Explore interesting places within ${radius}km of your location, discovering local gems and hidden spots.`,
    stops: itinerary.stops.map((stop, index) => ({
      name: stop.name,
      description: `Experience ${stop.name}, a notable location in ${city}.`,
      uniqueFeature: "A unique place worth exploring during your adventure.",
      narrativeConnection: `Stop ${index + 1} in your ${city} exploration.`,
      suggestedTime: stop.suggestedTime,
      travelTimeToNext: stop.travelTimeToNext,
      location: index === 0 ? startLocation : stop.location,
      completed: false
    })),
    transportMode: transportMode,
    estimatedDuration: `${timeRange} hours`,
    searchRadius: `${radius}km`,
    conclusion: `Your ${radius}km adventure around ${city} concludes with new discoveries and local insights.`
  };
}

function getDefaultLocations(city) {
  return [
    {
      name: `${city} City Center`,
      location: { latitude: 0, longitude: 0 },
      rating: 4.0,
      types: ['point_of_interest'],
      vicinity: city
    },
    {
      name: `${city} Museum`,
      location: { latitude: 0, longitude: 0 },
      rating: 4.2,
      types: ['museum'],
      vicinity: city
    }
  ];
}

module.exports = {
  generateAdventure
};