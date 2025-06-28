import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAdventure } from '../../context/AdventureContext';
import AdventureStop from './AdventureStop';
import AdventureMap from './AdventureMap';

const AdventureDetails = () => {
  const { adventure } = useAdventure();
  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  
  if (!adventure) {
    return (
      <div className="text-center">
        <p>No adventure found. Please generate a new adventure.</p>
        <Link to="/" className="text-primary hover:underline">Go back to start</Link>
      </div>
    );
  }

  const completedStops = adventure.stops ? adventure.stops.filter(stop => stop.completed).length : 0;
  const totalStops = adventure.stops ? adventure.stops.length : 0;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Adventure Header */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h1 className="text-3xl font-bold mb-2">{adventure.title}</h1>
        <p className="text-gray-600 mb-4">{adventure.introduction}</p>
        
        {/* Adventure Stats */}
        <div className="flex flex-wrap gap-4 text-sm">
          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
            {adventure.transportMode}
          </span>
          <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full">
            {adventure.estimatedDuration || adventure.totalDuration}
          </span>
          <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full">
            {totalStops} stops
          </span>
          {adventure.searchRadius && (
            <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full">
              {adventure.searchRadius} radius
            </span>
          )}
        </div>
      </div>

      {/* Starting Point Info */}
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
        <div className="flex">
          <div className="ml-3">
            <p className="text-sm text-blue-700">
              <strong>Starting from your location</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Progress Overview</h2>
        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
          <div 
            className="bg-primary h-2.5 rounded-full transition-all duration-300" 
            style={{ width: `${totalStops > 0 ? (completedStops / totalStops) * 100 : 0}%` }}
          ></div>
        </div>
        <p className="text-sm text-gray-600">
          {completedStops} of {totalStops} stops completed
        </p>
      </div>

      {/* Map */}
      {adventure.stops && adventure.stops.length > 0 && (
        <div className="mb-6">
          <AdventureMap stops={adventure.stops} currentStopIndex={currentStopIndex} />
        </div>
      )}

      {/* Adventure Stops */}
      <div className="space-y-4">
        {adventure.stops && adventure.stops.map((stop, index) => (
          <AdventureStop
            key={index}
            stop={stop}
            index={index}
            totalStops={totalStops}
            isStartingPoint={false}
            isUserLocation={false}
            onStopClick={() => setCurrentStopIndex(index)}
          />
        ))}
      </div>

      {/* Adventure Conclusion */}
      {adventure.conclusion && (
        <div className="bg-gray-50 rounded-lg p-6 mt-6">
          <h3 className="text-lg font-semibold mb-2">Adventure Complete!</h3>
          <p className="text-gray-700">{adventure.conclusion}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4 mt-8">
        <Link 
          to="/" 
          className="flex-1 bg-primary text-white py-3 px-4 rounded-md text-center hover:bg-primary-dark"
        >
          Create New Adventure
        </Link>
        <Link 
          to="/summary" 
          className="flex-1 bg-gray-200 text-gray-800 py-3 px-4 rounded-md text-center hover:bg-gray-300"
        >
          View Summary
        </Link>
      </div>
    </div>
  );
};

export default AdventureDetails;