
import { useState } from 'react';
import { FaExclamationTriangle } from 'react-icons/fa';

const TimingWarning = ({ message }) => {
  const [dismissed, setDismissed] = useState(false);
  
  if (dismissed) return null;
  
  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4 rounded">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <FaExclamationTriangle className="h-5 w-5 text-yellow-400" />
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm text-yellow-700">{message}</p>
        </div>
        <button 
          onClick={() => setDismissed(true)}
          className="ml-auto pl-3 text-yellow-500 hover:text-yellow-600"
        >
          &times;
        </button>
      </div>
    </div>
  );
};

export default TimingWarning;