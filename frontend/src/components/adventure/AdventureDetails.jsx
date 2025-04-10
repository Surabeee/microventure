import { useNavigate } from 'react-router-dom';
import { useAdventure } from '../../context/AdventureContext';
import AdventureStop from './AdventureStop';

const AdventureDetails = () => {
  const navigate = useNavigate();
  const { adventure, isAdventureCompleted } = useAdventure();
  
  if (!adventure) {
    return null;
  }
  
  const handleFinishAdventure = () => {
    navigate('/summary');
  };
  
  const allCompleted = isAdventureCompleted();
  
  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h1 className="text-2xl font-bold mb-2">{adventure.title}</h1>
        <p className="text-gray-700 mb-4">{adventure.introduction}</p>
        <div className="flex flex-wrap gap-3 text-sm">
          <span className="bg-gray-100 px-3 py-1 rounded-full">
            {adventure.transportMode}
          </span>
          <span className="bg-gray-100 px-3 py-1 rounded-full">
            ~{adventure.totalDuration} hours
          </span>
          <span className="bg-gray-100 px-3 py-1 rounded-full">
            {adventure.stops.length} stops
          </span>
        </div>
      </div>
      
      {adventure.stops.map((stop, index) => (
        <AdventureStop 
          key={index} 
          stop={stop} 
          index={index} 
          totalStops={adventure.stops.length} 
        />
      ))}
      
      {allCompleted && (
        <div className="text-center mt-8">
          <button
            onClick={handleFinishAdventure}
            className="bg-primary text-white py-3 px-6 rounded-md hover:bg-blue-600 transition duration-200 font-medium text-lg"
          >
            Complete Adventure
          </button>
        </div>
      )}
    </div>
  );
};

export default AdventureDetails;