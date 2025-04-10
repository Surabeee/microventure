import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdventure } from '../context/AdventureContext';

const Summary = () => {
  const navigate = useNavigate();
  const { adventure, isAdventureCompleted } = useAdventure();
  
  useEffect(() => {
    // Redirect if no adventure or not all stops completed
    if (!adventure || !isAdventureCompleted()) {
      navigate('/');
    }
  }, [adventure, isAdventureCompleted, navigate]);
  
  if (!adventure) return null;
  
  const handleNewAdventure = () => {
    navigate('/');
  };
  
  // Calculate some stats
  const totalStops = adventure.stops.length;
  const estimatedDistance = totalStops * 0.5; // Just a placeholder calculation
  
  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Adventure Complete!</h1>
          <p className="text-xl text-gray-600">
            You've successfully completed "{adventure.title}"
          </p>
        </div>
        
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Journey Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-gray-500">Locations Visited</p>
              <p className="text-2xl font-bold">{totalStops}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-gray-500">Time Spent</p>
              <p className="text-2xl font-bold">~{adventure.totalDuration} hours</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-gray-500">Approx. Distance</p>
              <p className="text-2xl font-bold">{estimatedDistance.toFixed(1)} km</p>
            </div>
          </div>
        </div>
        
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Places You Explored</h2>
          <ul className="bg-gray-50 rounded-lg p-4">
            {adventure.stops.map((stop, index) => (
              <li key={index} className={index !== adventure.stops.length - 1 ? "mb-4 pb-4 border-b border-gray-200" : ""}>
                <h3 className="font-semibold text-lg">{stop.name}</h3>
                <p className="text-gray-700">{stop.description}</p>
              </li>
            ))}
          </ul>
        </div>
        
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Final Thoughts</h2>
          <p className="text-gray-700">{adventure.conclusion}</p>
        </div>
        
        <div className="text-center">
          <button
            onClick={handleNewAdventure}
            className="bg-primary text-white py-3 px-6 rounded-md hover:bg-blue-600 transition duration-200 font-medium"
          >
            Create a New Adventure
          </button>
        </div>
      </div>
    </div>
  );
};

export default Summary;