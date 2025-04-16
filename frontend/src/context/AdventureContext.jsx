import { createContext, useState, useContext } from 'react';

const AdventureContext = createContext();

export const useAdventure = () => useContext(AdventureContext);

export const AdventureProvider = ({ children }) => {
  const [adventure, setAdventure] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState('idle'); // 'idle', 'loading', 'success', 'error'
  const [locationError, setLocationError] = useState(null);
  
  // Reset adventure state
  const resetAdventure = () => {
    setAdventure(null);
    setError(null);
  };
  
  // Update stop completion status
  const completeStop = (stopIndex) => {
    if (!adventure) return;
    
    const updatedStops = adventure.stops.map((stop, idx) => 
      idx === stopIndex ? { ...stop, completed: true } : stop
    );
    
    setAdventure({
      ...adventure,
      stops: updatedStops
    });
  };
  
  // Check if all stops are completed
  const isAdventureCompleted = () => {
    if (!adventure) return false;
    return adventure.stops.every(stop => stop.completed);
  };
  
  return (
    <AdventureContext.Provider value={{
      adventure,
      setAdventure,
      loading,
      setLoading,
      error,
      setError,
      resetAdventure,
      completeStop,
      isAdventureCompleted,
      userLocation,
      setUserLocation,
      locationStatus,
      setLocationStatus,
      locationError,
      setLocationError
    }}>
      {children}
    </AdventureContext.Provider>
  );
};