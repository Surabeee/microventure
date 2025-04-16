import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdventure } from '../../context/AdventureContext';
import api from '../../services/api';
import { getCurrentLocation, getLocationName } from '../../utils/locationService';
import { FaLocationArrow, FaTimes, FaCheck } from 'react-icons/fa';

const AdventureForm = () => {
  const navigate = useNavigate();
  const { 
    setAdventure, 
    setLoading, 
    setError, 
    userLocation, 
    setUserLocation,
    locationStatus,
    setLocationStatus,
    locationError,
    setLocationError
  } = useAdventure();
  
  const [city, setCity] = useState('');
  const [duration, setDuration] = useState('2');
  const [transportMode, setTransportMode] = useState('walking');
  const [locationName, setLocationName] = useState('');
  
  // Request user's location
  const requestLocation = async () => {
    setLocationStatus('loading');
    setLocationError(null);
    
    try {
      const location = await getCurrentLocation();
      setUserLocation(location);
      
      // Get location name for display
      const name = await getLocationName(location.latitude, location.longitude);
      setLocationName(name);
      
      setLocationStatus('success');
    } catch (error) {
      console.error('Location error:', error);
      setLocationError(error.message);
      setLocationStatus('error');
    }
  };
  
  // Clear location data
  const clearLocation = () => {
    setUserLocation(null);
    setLocationName('');
    setLocationStatus('idle');
    setLocationError(null);
  };
  
  // Submit form with or without location
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // Include location if available
      const adventureData = {
        city,
        duration,
        transportMode,
      };
      
      // Only add location if we have it
      if (userLocation) {
        adventureData.location = {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude
        };
      }
      
      const result = await api.generateAdventure(
        adventureData.city,
        adventureData.duration,
        adventureData.transportMode,
        adventureData.location
      );
      
      setAdventure(result);
      navigate('/adventure');
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to generate adventure. Please try again.');
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
        
        <div className="mb-4">
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
        
        <div className="mb-6">
          <label className="block text-gray-700 mb-2">Starting Location</label>
          
          {locationStatus === 'success' ? (
            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-center">
                <FaCheck className="text-green-500 mr-2" />
                <span>{locationName}</span>
              </div>
              <button 
                type="button"
                onClick={clearLocation}
                className="text-gray-500 hover:text-gray-700"
              >
                <FaTimes />
              </button>
            </div>
          ) : locationStatus === 'loading' ? (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-md flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary mr-2"></div>
              <span>Getting your location...</span>
            </div>
          ) : locationStatus === 'error' ? (
            <div className="mb-2">
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 mb-2">
                {locationError}
              </div>
              <button
                type="button"
                onClick={requestLocation}
                className="text-primary hover:underline text-sm"
              >
                Try again
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={requestLocation}
              className="w-full flex items-center justify-center bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 transition duration-200 border border-gray-300"
            >
              <FaLocationArrow className="mr-2" />
              Use my current location
            </button>
          )}
          
          {locationStatus !== 'idle' && locationStatus !== 'success' && (
            <p className="text-sm text-gray-500 mt-2">
              Your adventure will start from a random location in {city} if you don't provide your current location.
            </p>
          )}
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