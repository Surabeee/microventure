import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const api = {
  generateAdventure: async (city, duration, transportMode) => {
    try {
      const response = await axios.post(`${API_URL}/adventure/generate`, {
        city,
        duration,
        transportMode
      });
      return response.data;
    } catch (error) {
      console.error('API error:', error);
      throw error;
    }
  }
};

export default api;