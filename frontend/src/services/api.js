import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const api = {
  generateAdventure: async (city, duration, transportMode, location = null) => {
    try {
      const response = await axios.post(`${API_URL}/adventure/generate`, {
        city,
        duration,
        transportMode,
        location
      });
      
      // Validate the response has proper structure
      const adventure = response.data;
      
      return adventure;
    } catch (error) {
      console.error('API error:', error);
      throw error.response?.data?.error || error.message || 'Failed to generate adventure';
    }
  },
  
  // Add a method to get directions between points
  getDirections: async (origin, destination, mode) => {
    try {
      const response = await axios.post(`${API_URL}/directions`, {
        origin,
        destination,
        mode
      });
      
      return response.data;
    } catch (error) {
      console.error('Directions API error:', error);
      throw error;
    }
  }
};

export default api;