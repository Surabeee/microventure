import { useEffect } from 'react';
import AdventureForm from '../components/adventure/AdventureForm';
import { useAdventure } from '../context/AdventureContext';

const Home = () => {
  const { resetAdventure, loading, error } = useAdventure();
  
  useEffect(() => {
    // Reset adventure state when coming to home page
    resetAdventure();
  }, [resetAdventure]);
  
  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Discover the Extraordinary in Everyday Places</h1>
        <p className="text-xl text-gray-600">
          Turn routine exploration into narrative-driven adventures that reveal the hidden character of cities.
        </p>
      </div>
      
      {error && (
        <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          {error}
        </div>
      )}
      
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          <p className="mt-4 text-gray-600">Creating your adventure...</p>
        </div>
      ) : (
        <AdventureForm />
      )}
    </div>
  );
};

export default Home;