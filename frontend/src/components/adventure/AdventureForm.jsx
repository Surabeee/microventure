import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdventure } from '../../context/AdventureContext';
import { getCurrentLocation } from '../../utils/locationService';

const AdventureForm = () => {
  const navigate = useNavigate();
  const { generateAdventure, loading } = useAdventure();
  
  const [formData, setFormData] = useState({
    city: '',
    radius: 8, // Default to 8km
    transportMode: 'walking',
    preferences: [],
    useCurrentLocation: false,
    location: null
  });

  const radiusPresets = [
    { label: '🏠 Local', value: 3, description: '2-3km' },
    { label: '🌆 City', value: 8, description: '8-10km' },
    { label: '🚇 Metro', value: 15, description: '15-20km' }
  ];

  const handlePresetClick = (value) => {
    setFormData(prev => ({ ...prev, radius: value }));
  };

  const handleGetCurrentLocation = async () => {
    try {
      const location = await getCurrentLocation();
      setFormData(prev => ({ 
        ...prev, 
        location, 
        useCurrentLocation: true,
        city: 'Current Location' 
      }));
    } catch (error) {
      console.error('Error getting location:', error);
      alert('Unable to get your location. Please enter a city manually.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.city && !formData.location) {
      alert('Please enter a city or use your current location');
      return;
    }

    try {
      await generateAdventure(
        formData.city,
        formData.radius,
        formData.transportMode,
        formData.location,
        formData.preferences
      );
      navigate('/adventure');
    } catch (error) {
      console.error('Error generating adventure:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
      
      {/* Location Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Location
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={formData.city}
            onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value, useCurrentLocation: false, location: null }))}
            placeholder="Enter city name"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={formData.useCurrentLocation}
          />
          <button
            type="button"
            onClick={handleGetCurrentLocation}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Use Current Location
          </button>
        </div>
      </div>

      {/* Radius Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Search Radius: {formData.radius}km
        </label>
        
        {/* Preset Buttons */}
        <div className="flex gap-2 mb-3">
          {radiusPresets.map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => handlePresetClick(preset.value)}
              className={`px-3 py-2 text-sm rounded-md border ${
                formData.radius === preset.value
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {preset.label}
              <div className="text-xs opacity-75">{preset.description}</div>
            </button>
          ))}
        </div>
        
        {/* Radius Slider */}
        <input
          type="range"
          min="1"
          max="25"
          value={formData.radius}
          onChange={(e) => setFormData(prev => ({ ...prev, radius: parseInt(e.target.value) }))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>1km</span>
          <span>25km</span>
        </div>
      </div>

      {/* Transport Mode */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Transportation
        </label>
        <select
          value={formData.transportMode}
          onChange={(e) => setFormData(prev => ({ ...prev, transportMode: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="walking">Walking</option>
          <option value="public transit">Public Transit</option>
          <option value="car/taxi">Car/Taxi</option>
        </select>
      </div>

      {/* Preferences */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Interests (Optional)
        </label>
        <div className="grid grid-cols-2 gap-2">
          {['museums', 'parks', 'food', 'shopping', 'historical', 'cultural', 'nature', 'entertainment'].map((pref) => (
            <label key={pref} className="flex items-center">
              <input
                type="checkbox"
                checked={formData.preferences.includes(pref)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setFormData(prev => ({ ...prev, preferences: [...prev.preferences, pref] }));
                  } else {
                    setFormData(prev => ({ ...prev, preferences: prev.preferences.filter(p => p !== pref) }));
                  }
                }}
                className="mr-2"
              />
              <span className="capitalize">{pref}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-primary text-white py-3 px-4 rounded-md hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Generating Adventure...' : 'Create Adventure'}
      </button>
    </form>
  );
};

export default AdventureForm;