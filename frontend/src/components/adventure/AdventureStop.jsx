import { useAdventure } from '../../context/AdventureContext';

const AdventureStop = ({ stop, index, totalStops }) => {
  const { completeStop } = useAdventure();
  
  const handleComplete = () => {
    completeStop(index);
  };
  
  return (
    <div className={`bg-white p-6 rounded-lg shadow-md mb-6 ${stop.completed ? 'border-l-4 border-green-500' : ''}`}>
      <div className="flex items-center mb-4">
        <div className="bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center mr-3">
          {index + 1}
        </div>
        <h3 className="text-xl font-semibold">{stop.name}</h3>
      </div>
      
      <div className="mb-4">
        <p className="text-gray-700 mb-2">{stop.description}</p>
        <p className="text-gray-700 mb-2"><span className="font-medium">What makes it special:</span> {stop.uniqueFeature}</p>
        <p className="text-gray-700 mb-2"><span className="font-medium">Connection to your journey:</span> {stop.narrativeConnection}</p>
        <p className="text-gray-700"><span className="font-medium">Recommended time:</span> {stop.timeToSpend} minutes</p>
      </div>
      
      {index < totalStops - 1 && (
        <div className="border-t border-gray-200 pt-3 mt-3">
          <p className="text-sm text-gray-500">
            Next stop is about {Math.round(Math.random() * 10 + 5)} minutes away
          </p>
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