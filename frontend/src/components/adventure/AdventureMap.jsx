import { useState, useEffect } from 'react';

// Use Mapbox instead of Google Maps
const MAPBOX_ACCESS_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

const AdventureMap = ({ stops, currentStopIndex = 0 }) => {
  const [mapUrl, setMapUrl] = useState('');
  
  useEffect(() => {
    if (!stops || stops.length === 0 || !stops[0].location) {
      return;
    }
    
    // Filter out stops without location data
    const validStops = stops.filter(stop => stop.location);
    
    if (validStops.length === 0) {
      return;
    }

    // Create Mapbox Static API URL
    const center = validStops[currentStopIndex >= 0 && currentStopIndex < validStops.length ? 
                             currentStopIndex : 0].location;
    
    // Create markers for Mapbox
    const markers = validStops.map((stop, index) => {
      const { latitude, longitude } = stop.location;
      
      let markerColor;
      let markerSize;
      
      if (index === 0) {
        // Starting point - user's location
        markerColor = 'blue';
        markerSize = 'l';
      } else if (index <= currentStopIndex) {
        // Completed stops
        markerColor = 'green';
        markerSize = 'm';
      } else {
        // Future stops
        markerColor = 'red';
        markerSize = 'm';
      }
      
      return `pin-${markerSize}-${markerColor}(${longitude},${latitude})`;
    }).join(',');
    
    // Build Mapbox Static API URL
    const mapboxUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/${markers}/${center.longitude},${center.latitude},13,0/600x400@2x?access_token=${MAPBOX_ACCESS_TOKEN}`;
    
    setMapUrl(mapboxUrl);
    
  }, [stops, currentStopIndex]);
  
  if (!MAPBOX_ACCESS_TOKEN) {
    return (
      <div className="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center">
        <p className="text-gray-600">Map unavailable - Mapbox token not configured</p>
      </div>
    );
  }
  
  if (!mapUrl) {
    return (
      <div className="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center animate-pulse">
        <p className="text-gray-600">Loading map...</p>
      </div>
    );
  }
  
  return (
    <div className="w-full h-64 rounded-lg overflow-hidden shadow-md">
      <img 
        src={mapUrl} 
        alt="Adventure route map"
        className="w-full h-full object-cover"
        onError={() => {
          console.error('Failed to load Mapbox map');
        }}
      />
    </div>
  );
};

export default AdventureMap;