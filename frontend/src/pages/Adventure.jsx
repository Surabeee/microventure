import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdventureDetails from '../components/adventure/AdventureDetails';
import { useAdventure } from '../context/AdventureContext';

const Adventure = () => {
  const navigate = useNavigate();
  const { adventure, loading } = useAdventure();
  
  useEffect(() => {
    // Redirect to home if no adventure is loaded
    if (!adventure && !loading) {
      navigate('/');
    }
  }, [adventure, loading, navigate]);
  
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <p className="mt-4 text-gray-600">Loading your adventure...</p>
      </div>
    );
  }
  
  return <AdventureDetails />;
};

export default Adventure;