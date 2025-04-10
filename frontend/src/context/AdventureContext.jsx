import { createContext, useState, useContext } from 'react';

const AdventureContext = createContext();

export const useAdventure = () => useContext(AdventureContext);

export const AdventureProvider = ({ children }) => {
  const [adventure, setAdventure] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
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
      isAdventureCompleted
    }}>
      {children}
    </AdventureContext.Provider>
  );
};