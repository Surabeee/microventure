const { GoogleGenAI } = require("@google/genai");

// Initialize the Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });


async function generateAdventure(city, duration, transportMode) {
  try {
    
    // Create the prompt for adventure generation
    const prompt = `
    Create a micro-adventure in ${city} that takes approximately ${duration} hours using ${transportMode} as the primary mode of transportation.

    The adventure should include 2-5 interesting locations to visit, forming a cohesive narrative journey.
    
    For each location, provide:
    1. The name of the location
    2. A brief description (2-3 sentences)
    3. What makes it special or unique
    4. How it connects to the overall narrative of the adventure
    5. Approximate time to spend there
    
    Also include:
    - A compelling title for the adventure
    - A brief introduction to set the theme
    - Approximate travel time between locations
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
          "timeToSpend": "Time in minutes",
          "completed": false
        }
      ],
      "transportMode": "The mode of transport",
      "totalDuration": "Total duration in hours",
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
    
    return parsedResponse;
  } catch (error) {
    console.error("Error generating adventure:", error);
    throw error;
  }
}

module.exports = { generateAdventure };