import { useNavigate } from 'react-router-dom';
import { useAdventure } from '../../context/AdventureContext';
import AdventureStop from './AdventureStop';
import AdventureMap from './AdventureMap';
import TimingWarning from './TimingWarning';
import { FaLocationArrow, FaClock, FaRoute } from 'react-icons/fa';

const AdventureDetails = () => {
  const navigate = useNavigate();
  const { adventure, isAdventureCompleted, userLocation } = useAdventure();
  
  if (!adventure) {
    return null;
  }
  
  const handleFinishAdventure = () => {
    navigate('/summary');
  };
  
  const allCompleted = isAdventureCompleted();
  
  // Find current stop (first non-completed stop)
  const currentStopIndex = adventure.stops.findIndex(stop => !stop.completed);
  
  // Calculate time distribution
  const calculateTimeDistribution = () => {
    const stops = adventure.stops;
    let visitTime = 0;
    let travelTime = 0;
    
    stops.forEach((stop, index) => {
      visitTime += parseInt(stop.timeToSpend) || 0;
      if (index < stops.length - 1 && stop.travelTimeToNext) {
        travelTime += parseInt(stop.travelTimeToNext) || 0;
      }
    });
    
    return { visitTime, travelTime, total: visitTime + travelTime };
  };
  
  const timeDistribution = calculateTimeDistribution();
  const totalDurationMinutes = parseInt(adventure.totalDuration) * 60 || timeDistribution.total;
  
  // Prepare stops for map
  const stopsForMap = adventure.stops.map((stop, index) => {
    return {
      name: stop.name,
      location: stop.location || null,
      completed: stop.completed
    };
  });
  
  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h1 className="text-2xl font-bold mb-2">{adventure.title}</h1>
        <p className="text-gray-700 mb-4">{adventure.introduction}</p>
        
        <div className="flex flex-wrap gap-3 text-sm mb-3">
          <span className="bg-gray-100 px-3 py-1 rounded-full">
            {adventure.transportMode}
          </span>
          <span className="bg-gray-100 px-3 py-1 rounded-full">
            ~{adventure.totalDuration}
          </span>
          <span className="bg-gray-100 px-3 py-1 rounded-full">
            {adventure.stops.length} stops
          </span>
        </div>
        
        {userLocation && (
          <div className="flex items-center text-sm text-gray-600 mb-3">
            <FaLocationArrow className="text-primary mr-2" />
            <span>Starting from your current location</span>
          </div>
        )}
        
        {timeDistribution.total > totalDurationMinutes * 1.2 && (
          <TimingWarning 
            message={`This adventure may take approximately ${timeDistribution.total} minutes, which is longer than the ${totalDurationMinutes} minutes you requested. The stops and timing have been adjusted to be more realistic.`} 
          />
        )}
        
        <div className="bg-gray-50 p-3 rounded-lg mb-4">
          <h3 className="text-sm font-semibold mb-2 flex items-center">
            <FaClock className="mr-2" />
            Time Breakdown
          </h3>
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div>
              <p className="text-gray-500">Exploration</p>
              <p className="font-semibold">{timeDistribution.visitTime} min</p>
            </div>
            <div>
              <p className="text-gray-500">Travel</p>
              <p className="font-semibold">{timeDistribution.travelTime} min</p>
            </div>
            <div>
              <p className="text-gray-500">Total</p>
              <p className="font-semibold">{totalDurationMinutes} min</p>
            </div>
          </div>
        </div>

        {adventure.stops.some(stop => stop.name.includes('Interesting Spot')) && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4 rounded">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  Some locations in this adventure are using approximate data. For a more customized experience, try a different location or transportation mode.
                </p>
              </div>
            </div>
          </div>
        )}

        
        {/* Map of the adventure */}
        <AdventureMap 
          stops={stopsForMap} 
          currentStopIndex={currentStopIndex === -1 ? adventure.stops.length - 1 : currentStopIndex} 
        />
      </div>
      
      {adventure.stops.map((stop, index) => (
        <AdventureStop 
          key={index} 
          stop={stop} 
          index={index} 
          totalStops={adventure.stops.length} 
          isStartingPoint={index === 0 && userLocation !== null}
          showDirections={true}
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