import { useState } from 'react';
import { useAdventure } from '../../context/AdventureContext';
import { FaLocationArrow, FaWalking, FaBus, FaTaxi, FaClock, FaChevronDown, FaChevronUp } from 'react-icons/fa';

const AdventureStop = ({ stop, index, totalStops, isStartingPoint, showDirections = false }) => {
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
        <h3 className="text-xl font-semibold">{stop.name}</h3>
        {isStartingPoint && (
          <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
            Starting Point
          </span>
        )}
      </div>
      
      <div className="mb-4">
        <p className="text-gray-700 mb-2">{stop.description}</p>
        <p className="text-gray-700 mb-2"><span className="font-medium">What makes it special:</span> {stop.uniqueFeature}</p>
        <p className="text-gray-700 mb-2"><span className="font-medium">Connection to your journey:</span> {stop.narrativeConnection}</p>
        <div className="flex items-center text-gray-700">
          <FaClock className="mr-1" />
          <span className="font-medium mr-2">Recommended time:</span> {stop.timeToSpend} minutes
        </div>
      </div>
      
      {/* Directions to next stop */}
      {index < totalStops - 1 && stop.travelTimeToNext && (
        <div className="border-t border-gray-200 pt-3 mt-3">
          <div className="flex justify-between items-center cursor-pointer" onClick={toggleDirections}>
            <div className="flex items-center text-gray-600">
              {getTransportIcon(stop.transportMode || "walking")}
              <span className="ml-2">
                {stop.distanceToNext ? `${stop.distanceToNext} • ` : ''}
                {stop.travelTimeToNext} minutes to next stop
              </span>
            </div>
            <button className="text-gray-500">
              {directionsExpanded ? <FaChevronUp /> : <FaChevronDown />}
            </button>
          </div>
          
          {directionsExpanded && showDirections && stop.directionsToNext && (
            <div className="mt-3 pt-2 border-t border-gray-100">
              <h4 className="text-sm font-medium mb-2">Directions to next stop:</h4>
              <ol className="text-sm text-gray-600 space-y-2 pl-5">
                {stop.directionsToNext.map((step, stepIndex) => (
                  <li key={stepIndex} className="list-decimal">
                    <div className="flex items-start">
                      <span className="mr-2 mt-1">{getTransportIcon(step.travelMode)}</span>
                      <div>
                        <p>{renderInstructions(step.instructions)}</p>
                        <p className="text-xs text-gray-500">{step.distance} • {step.duration}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
      
      {!stop.completed && (
        <button
          onClick={handleComplete}
          className="mt-4 bg-secondary text-white py-2 px-4 rounded-md hover:bg-green-600 transition duration-200"
        >
          Mark as Completed
        </button>
      )}
      
      {stop.completed && (
        <div className="mt-4 text-green-600 font-medium flex items-center">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
          </svg>
          Completed!
        </div>
      )}
    </div>
  );
};

export default AdventureStop;