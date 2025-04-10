import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdventure } from '../../context/AdventureContext';
import api from '../../services/api';

const AdventureForm = () => {
  const navigate = useNavigate();
  const { setAdventure, setLoading, setError } = useAdventure();
  
  const [city, setCity] = useState('');
  const [duration, setDuration] = useState('2');
  const [transportMode, setTransportMode] = useState('walking');
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.generateAdventure(city, duration, transportMode);
      setAdventure(result);
      navigate('/adventure');
    } catch (err) {
      setError('Failed to generate adventure. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center">Create Your Adventure</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="city" className="block text-gray-700 mb-2">City</label>
          <input
            type="text"
            id="city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="e.g., New York, London, Tokyo"
            required
          />
        </div>
        
        <div className="mb-4">
          <label htmlFor="duration" className="block text-gray-700 mb-2">Time Available (hours)</label>
          <select
            id="duration"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            required
          >
            <option value="1">1 hour</option>
            <option value="2">2 hours</option>
            <option value="3">3 hours</option>
            <option value="4">4 hours</option>
            <option value="6">6 hours</option>
            <option value="8">8 hours</option>
          </select>
        </div>
        
        <div className="mb-6">
          <label className="block text-gray-700 mb-2">Transportation Mode</label>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="walking"
                checked={transportMode === 'walking'}
                onChange={() => setTransportMode('walking')}
                className="mr-2"
              />
              Walking
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="public transit"
                checked={transportMode === 'public transit'}
                onChange={() => setTransportMode('public transit')}
                className="mr-2"
              />
              Public Transit
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="car/taxi"
                checked={transportMode === 'car/taxi'}
                onChange={() => setTransportMode('car/taxi')}
                className="mr-2"
              />
              Car/Taxi
            </label>
          </div>
        </div>
        
        <button
          type="submit"
          className="w-full bg-primary text-white py-2 px-4 rounded-md hover:bg-blue-600 transition duration-200"
        >
          Generate Adventure
        </button>
      </form>
    </div>
  );
};

export default AdventureForm;