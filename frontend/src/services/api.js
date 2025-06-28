import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = {
  generateAdventure: async (city, radius, transportMode, location = null, preferences = []) => {
    try {
      const response = await axios.post(`${API_URL}/adventure/generate`, {
        city,
        radius,
        transportMode,
        location,
        preferences
      });
      
      const adventure = response.data;
      return adventure;
    } catch (error) {
      console.error('API error:', error);
      if (error.response && error.response.data) {
        throw error.response.data;
      }
      throw error.message || 'Failed to generate adventure';
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