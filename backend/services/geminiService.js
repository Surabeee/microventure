const { GoogleGenAI } = require("@google/genai");
const { findSuitableLocations, createOptimizedItinerary } = require('./locationService');
const { geocodeAddress } = require('./mapsService');

// Initialize the Gemini API
const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);

// Initialize the Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });


async function generateAdventure(city, duration, transportMode, location = null, preferences = []) {
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
      transportMode,
      preferences
    );
    
    if (candidatePlaces.length === 0) {
      console.log("Could not find interesting locations with Places API, falling back to manual location generation");
      
      // Generate some fictional locations around the starting point
      const fallbackLocations = generateFallbackLocations(startLocation, city, durationHours, transportMode);
      
      // Use these instead of the API results
      return createFallbackAdventure(fallbackLocations, startLocation, city, durationHours, transportMode);
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
      if (index === 0) {
        return `Starting point: ${stop.name}`;
      }
      
      // Include more information about the place if available
      let placeInfo = `Stop ${index}: ${stop.name} (spending ${stop.timeToSpend} minutes)`;
      
      if (stop.description) {
        placeInfo += `\nDescription: ${stop.description}`;
      }
      
      if (stop.types && stop.types.length > 0) {
        placeInfo += `\nType: ${stop.types.join(', ')}`;
      }
      
      if (stop.rating) {
        placeInfo += `\nRating: ${stop.rating}/5 (${stop.userRatingsTotal || 'unknown'} reviews)`;
      }
      
      return placeInfo;
    }).join("\n\n");
    
    const travelInfoForPrompt = itinerary.legs.map((leg, index) => {
      return `Travel from ${leg.origin} to ${leg.destination}: ${leg.travelTime} minutes by ${transportMode}`;
    }).join("\n");
    
    const prompt = `
    Create an engaging micro-adventure in ${city} using the following pre-validated itinerary:
    
    IMPORTANT: This itinerary has been carefully validated to fit within ${durationHours} hours using ${transportMode} as the transportation mode.
    
    Locations:
    ${placesForPrompt}
    
    Travel times (already calculated accurately):
    ${travelInfoForPrompt}
    
    Total travel time: ${itinerary.totalTravelMinutes} minutes
    Total time at locations: ${itinerary.remainingMinutes} minutes
    
    Create a cohesive narrative journey connecting these specific real locations. Do NOT invent or add places that aren't listed above. Use the EXACT names provided.
    
    For each location, provide:
    1. The exact name of the location (as listed above)
    2. A vivid, engaging description that captures its essence and appeal (2-3 sentences)
    3. 1-2 unique and specific features that make this place special (mention something genuinely interesting about architecture, history, or visitor experience)
    4. How it connects to the overall narrative of the adventure (create a compelling storyline)
    5. The exact time to spend there as specified above
    
    Also include:
    - An evocative title for the adventure that captures its essence
    - A brief introduction that sets the theme and mood
    - A satisfying conclusion that ties the adventure together
    
    Format the response as a JSON object with the following structure:
    {
      "title": "Adventure Title",
      "introduction": "Brief introduction to the adventure theme",
      "stops": [
        {
          "name": "Exact Location Name",
          "description": "Vivid location description with specific details",
          "uniqueFeature": "What makes it special (be specific and factual)",
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

/**
 * Generate fallback locations when Places API fails
 */
function generateFallbackLocations(startLocation, city, durationHours, transportMode) {
  // City-specific curated fallback locations
  const cityLocations = {
    'bangalore': [
      {
        name: "Cubbon Park",
        placeId: "fallback-cubbon",
        description: "A landmark 'lung' area of the city, known for its green spaces and historic statues.",
        types: ["park", "tourist_attraction"],
        rating: 4.5,
        location: { 
          latitude: startLocation.latitude + 0.01, 
          longitude: startLocation.longitude + 0.01 
        }
      },
      {
        name: "Commercial Street",
        placeId: "fallback-commercial",
        description: "A major shopping area known for its variety of stores selling clothes, jewelry and souvenirs.",
        types: ["shopping", "point_of_interest"],
        rating: 4.2,
        location: { 
          latitude: startLocation.latitude - 0.01, 
          longitude: startLocation.longitude + 0.015 
        }
      },
      {
        name: "Lalbagh Botanical Garden",
        placeId: "fallback-lalbagh",
        description: "Historic garden with a diverse collection of tropical plants and a famous glass house.",
        types: ["park", "tourist_attraction"],
        rating: 4.6,
        location: { 
          latitude: startLocation.latitude - 0.02, 
          longitude: startLocation.longitude - 0.01 
        }
      },
      {
        name: "UB City Mall",
        placeId: "fallback-ubcity",
        description: "Luxury shopping mall with high-end brands and fine dining options.",
        types: ["shopping_mall", "restaurant"],
        rating: 4.4,
        location: { 
          latitude: startLocation.latitude + 0.015, 
          longitude: startLocation.longitude - 0.01 
        }
      },
      {
        name: "Vidhana Soudha",
        placeId: "fallback-vidhana",
        description: "Impressive government building showcasing Neo-Dravidian architecture.",
        types: ["landmark", "government_building"],
        rating: 4.3,
        location: { 
          latitude: startLocation.latitude + 0.025, 
          longitude: startLocation.longitude + 0.005 
        }
      }
    ],
    'mumbai': [
      {
        name: "Gateway of India",
        placeId: "fallback-gateway",
        description: "Historic arch monument overlooking the Arabian Sea, built during the British Raj.",
        types: ["landmark", "tourist_attraction"],
        rating: 4.7,
        location: { 
          latitude: startLocation.latitude + 0.01, 
          longitude: startLocation.longitude + 0.01 
        }
      },
      // Add more Mumbai locations...
    ],
    // Add more cities...
  };
  
  // Normalize city name for matching
  const normalizedCity = city.toLowerCase().trim();
  
  // Check if we have curated locations for this city
  if (cityLocations[normalizedCity]) {
    console.log(`Using curated locations for ${city}`);
    return cityLocations[normalizedCity];
  }
  
  // If no curated locations, generate dynamic locations with better names
  console.log(`No curated locations for ${city}, generating dynamic locations`);
  
  const genericLocationTemplates = [
    {
      nameTemplate: "Central Park of CITY",
      description: "A beautiful green space in the heart of CITY, perfect for a relaxing stroll.",
      types: ["park", "tourist_attraction"],
      rating: 4.3
    },
    {
      nameTemplate: "CITY Museum of Art",
      description: "Houses an impressive collection of artwork, showcasing both local and international artists.",
      types: ["museum", "tourist_attraction"],
      rating: 4.4
    },
    {
      nameTemplate: "Historic CITY Market",
      description: "A bustling marketplace where locals and tourists alike come for unique goods and tasty local treats.",
      types: ["point_of_interest", "store"],
      rating: 4.2
    },
    {
      nameTemplate: "CITY Cultural Center",
      description: "A hub for local performances and exhibitions that showcase the rich culture of the region.",
      types: ["tourist_attraction", "point_of_interest"],
      rating: 4.1
    },
    {
      nameTemplate: "CITY Lookout Point",
      description: "Offers stunning panoramic views of the entire city and surrounding landscapes.",
      types: ["tourist_attraction", "viewpoint"],
      rating: 4.5
    }
  ];
  
  const locations = [];
  const count = durationHours <= 2 ? 3 : durationHours <= 4 ? 4 : 5;
  
  // Calculate distance scale based on transport mode
  let distanceScale;
  switch(transportMode) {
    case 'car/taxi':
      distanceScale = 0.01; // ~1.1km per 0.01 degree
      break;
    case 'public transit':
      distanceScale = 0.007; // ~0.77km per 0.007 degree
      break;
    case 'walking':
    default:
      distanceScale = 0.003; // ~0.33km per 0.003 degree
  }
  
  // Create locations in different directions from starting point
  for (let i = 0; i < count; i++) {
    // Get template and replace placeholders
    const template = genericLocationTemplates[i % genericLocationTemplates.length];
    const name = template.nameTemplate.replace(/CITY/g, city);
    
    // Create a point in a different direction for each location
    const angle = (i * (360 / count)) * (Math.PI / 180);
    const distance = distanceScale * (i + 1);
    
    // Calculate new coordinates (approximate)
    const latitude = startLocation.latitude + (distance * Math.cos(angle));
    const longitude = startLocation.longitude + (distance * Math.sin(angle));
    
    locations.push({
      name: name,
      placeId: `fallback-${i}`,
      description: template.description.replace(/CITY/g, city),
      types: template.types,
      rating: template.rating,
      location: {
        latitude,
        longitude
      }
    });
  }
  
  return locations;
}

/**
 * Create a fallback adventure with manually generated locations
 */
/**
 * Create a fallback adventure with manually generated locations
 */
async function createFallbackAdventure(locations, startLocation, city, durationHours, transportMode) {
  try {
    // Ensure locations is an array
    const locationArray = Array.isArray(locations) ? locations : [];
    
    const totalMinutes = durationHours * 60;
    const totalLocations = locationArray.length + 1; // +1 for starting point
    
    // Estimate travel times (approximations)
    const travelTimeBetweenStops = Math.floor(totalMinutes * 0.4 / Math.max(1, totalLocations - 1));
    const timePerStop = Math.floor((totalMinutes - (travelTimeBetweenStops * Math.max(1, totalLocations - 1))) / Math.max(1, totalLocations));
    
    // Prepare stops with starting point
    const stops = [
      {
        name: "Starting Point",
        description: `Your adventure begins here in ${city}.`,
        uniqueFeature: "This is where your journey starts, at your current location.",
        narrativeConnection: "The beginning of your adventure, where you'll set out to explore the area.",
        timeToSpend: timePerStop,
        travelTimeToNext: locationArray.length > 0 ? travelTimeBetweenStops : 0,
        location: startLocation,
        completed: false
      }
    ];
    
    // Add the other locations
    locationArray.forEach((location, index) => {
      const isLast = index === locationArray.length - 1;
      
      stops.push({
        name: location.name || `Interesting Spot ${index + 1}`,
        description: location.description || `A fascinating location in ${city} worth exploring.`,
        uniqueFeature: location.uniqueFeature || "This location has unique characteristics that make it an essential part of your adventure.",
        narrativeConnection: location.narrativeConnection || `Stop ${index + 1} in your journey, connecting the dots of your adventure.`,
        timeToSpend: timePerStop,
        travelTimeToNext: isLast ? 0 : travelTimeBetweenStops,
        location: location.location,
        completed: false
      });
    });
    
    // Try to use Gemini to enhance the adventure narrative
    try {
      const stopsDescription = stops.map((stop, index) => 
        `Stop ${index}: ${stop.name}\nDescription: ${stop.description}`).join('\n\n');
      
      const prompt = `
      Create an engaging micro-adventure in ${city} with the following stops:
      
      ${stopsDescription}
      
      Total duration: ${durationHours} hours
      Transportation: ${transportMode}
      
      Create a cohesive narrative connecting these places. For each location, provide:
      1. A brief engaging description (1-2 sentences)
      2. What makes it special or unique
      3. How it connects to the overall journey
      
      Also include:
      - A catchy title for the adventure
      - A brief introduction to set the theme
      - A conclusion that ties the adventure together
      
      Format the response as JSON with this structure:
      {
        "title": "Adventure Title",
        "introduction": "Introduction text",
        "stops": [
          {
            "name": "Stop Name",
            "description": "Description",
            "uniqueFeature": "What makes it special",
            "narrativeConnection": "How it connects to the journey"
          }
        ],
        "conclusion": "Conclusion text"
      }
      `;
      
      const result = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
      });
      
      const text = result.text;
      
      // Extract JSON from the response
      const jsonMatch = text.match(/```json\n([\s\S]*)\n```/) || text.match(/({[\s\S]*})/);
      let enhancedAdventure;
      
      if (jsonMatch && jsonMatch[1]) {
        enhancedAdventure = JSON.parse(jsonMatch[1]);
      } else {
        try {
          enhancedAdventure = JSON.parse(text);
        } catch (e) {
          console.error("Failed to parse JSON from Gemini response", e);
          // Continue with the basic adventure if Gemini enhancement fails
          throw e;
        }
      }
      
      // Merge the enhanced narrative with our existing stops
      if (enhancedAdventure && enhancedAdventure.stops) {
        for (let i = 0; i < Math.min(stops.length, enhancedAdventure.stops.length); i++) {
          const enhancedStop = enhancedAdventure.stops[i];
          stops[i] = {
            ...stops[i],
            description: enhancedStop.description || stops[i].description,
            uniqueFeature: enhancedStop.uniqueFeature || stops[i].uniqueFeature,
            narrativeConnection: enhancedStop.narrativeConnection || stops[i].narrativeConnection
          };
        }
        
        // Create the enhanced adventure
        return {
          title: enhancedAdventure.title || `Explore ${city}: A ${durationHours}-Hour Adventure`,
          introduction: enhancedAdventure.introduction || `Embark on a ${durationHours}-hour adventure through ${city}, discovering hidden gems and fascinating spots as you go.`,
          stops: stops,
          transportMode: transportMode,
          totalDuration: `${durationHours} hours`,
          conclusion: enhancedAdventure.conclusion || `You've completed your ${durationHours}-hour adventure through ${city}, experiencing the unique character of this fascinating area.`
        };
      }
      
      throw new Error('Could not enhance adventure narrative');
      
    } catch (narrativeError) {
      console.error('Error generating narrative:', narrativeError);
      // Fall back to basic adventure if narrative enhancement fails
    }
    
    // Create the basic adventure object
    return {
      title: `Explore ${city}: A ${durationHours}-Hour Adventure`,
      introduction: `Embark on a ${durationHours}-hour adventure through ${city}, discovering hidden gems and fascinating spots as you go.`,
      stops: stops,
      transportMode: transportMode,
      totalDuration: `${durationHours} hours`,
      conclusion: `You've completed your ${durationHours}-hour adventure through ${city}, experiencing the unique character of this fascinating area.`
    };
  } catch (error) {
    console.error('Error creating fallback adventure:', error);
    throw error;
  }
}

module.exports = { 
generateAdventure,
createFallbackAdventure,
generateFallbackLocations
};