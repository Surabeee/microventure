import { createContext, useContext, useState } from 'react';
import api from '../services/api';

const AdventureContext = createContext();

export const useAdventure = () => {
  const context = useContext(AdventureContext);
  if (!context) {
    throw new Error('useAdventure must be used within an AdventureProvider');
  }
  return context;
};

export const AdventureProvider = ({ children }) => {
  const [adventure, setAdventure] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generateAdventure = async (city, radius, transportMode, location, preferences) => {
    setLoading(true);
    setError(null);
    
    try {
      const newAdventure = await api.generateAdventure(city, radius, transportMode, location, preferences);
      setAdventure(newAdventure);
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const completeStop = (stopIndex) => {
    if (adventure && adventure.stops) {
      const updatedStops = adventure.stops.map((stop, index) => {
        if (index === stopIndex) {
          return { ...stop, completed: true };
        }
        return stop;
      });
      
      setAdventure(prev => ({
        ...prev,
        stops: updatedStops
      }));
    }
  };

  const resetAdventure = () => {
    setAdventure(null);
    setError(null);
  };

  const value = {
    adventure,
    loading,
    error,
    generateAdventure,
    completeStop,
    resetAdventure
  };

  return (
    <AdventureContext.Provider value={value}>
      {children}
    </AdventureContext.Provider>
  );
};