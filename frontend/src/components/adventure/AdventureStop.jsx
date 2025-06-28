import { useState } from 'react';
import { useAdventure } from '../../context/AdventureContext';
import { FaLocationArrow, FaWalking, FaBus, FaTaxi, FaClock, FaChevronDown, FaChevronUp } from 'react-icons/fa';

const AdventureStop = ({ stop, index, totalStops, isStartingPoint, isUserLocation = false, showDirections = false }) => {
  const { completeStop } = useAdventure();
  const [directionsExpanded, setDirectionsExpanded] = useState(false);
  
  const handleComplete = () => {
    completeStop(index);
  };
  
  // Determine transportation icon
  const getTransportIcon = (mode) => {
    if (mode === 'walking' || mode === 'WALKING') return <FaWalking />;
    if (mode === 'public transit' || mode === 'TRANSIT') return <FaBus />;
    return <FaTaxi />;
  };
  
  // Function to render HTML instructions safely
  const renderInstructions = (htmlInstructions) => {
    const div = document.createElement('div');
    div.innerHTML = htmlInstructions;
    return div.textContent || div.innerText || '';
  };
  
  // Toggle directions expansion
  const toggleDirections = () => {
    setDirectionsExpanded(!directionsExpanded);
  };
  
  return (
    <div className={`bg-white p-6 rounded-lg shadow-md mb-6 ${stop.completed ? 'border-l-4 border-green-500' : isStartingPoint ? 'border-l-4 border-primary' : ''}`}>
      <div className="flex items-center mb-4">
        <div className={`${isStartingPoint ? 'bg-primary' : 'bg-gray-700'} text-white rounded-full w-8 h-8 flex items-center justify-center mr-3`}>
          {isStartingPoint ? <FaLocationArrow className="text-sm" /> : index + 1}
        </div>
        <h3 className="text-xl font-semibold">
          {isUserLocation ? 'Your Starting Location' : stop.name}
        </h3>
        {stop.completed && (
          <span className="ml-auto bg-green-100 text-green-800 text-sm px-2 py-1 rounded-full">
            Completed ✓
          </span>
        )}
      </div>
      
      {!isUserLocation && (
        <div className="flex-1">
          <p className="text-gray-600 mb-2">{stop.description}</p>
          <p className="text-sm text-blue-600 mb-2">
            <strong>What makes it special:</strong> {stop.uniqueFeature}
          </p>
          <p className="text-sm text-gray-500 mb-4">{stop.narrativeConnection}</p>
          
          <div className="flex items-center text-sm text-gray-500 space-x-4">
            <span className="flex items-center">
              <FaClock className="mr-1" />
              Suggested: {stop.suggestedTime || stop.timeToSpend + ' minutes'}
            </span>
            {stop.travelTimeToNext > 0 && (
              <span className="flex items-center">
                {getTransportIcon(stop.transportMode || 'walking')}
                <span className="ml-1">{stop.travelTimeToNext} min to next</span>
              </span>
            )}
          </div>
        </div>
      )}
      
      {/* Action Buttons */}
      <div className="flex gap-2 mt-4">
        {!stop.completed && !isUserLocation && (
          <button
            onClick={handleComplete}
            className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors"
          >
            Mark as Complete
          </button>
        )}
        
        {showDirections && stop.steps && stop.steps.length > 0 && (
          <button
            onClick={toggleDirections}
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors flex items-center"
          >
            {directionsExpanded ? <FaChevronUp className="mr-1" /> : <FaChevronDown className="mr-1" />}
            Directions
          </button>
        )}
      </div>
      
      {/* Expanded Directions */}
      {directionsExpanded && stop.steps && (
        <div className="mt-4 bg-gray-50 p-4 rounded-md">
          <h4 className="font-semibold mb-2">Step-by-step directions:</h4>
          <ol className="list-decimal list-inside space-y-1">
            {stop.steps.map((step, stepIndex) => (
              <li key={stepIndex} className="text-sm text-gray-700">
                <span className="font-medium">{step.distance}</span> - {renderInstructions(step.instructions)}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
};

export default AdventureStop;