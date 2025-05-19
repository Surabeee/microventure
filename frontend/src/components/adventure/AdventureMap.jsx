import { useState, useEffect } from 'react';

// Use your Google Maps API key here
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

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
    
    // Create waypoints string for Google Maps
    let waypointsString = '';
    // Update this section
const markers = [];
validStops.forEach((stop, index) => {
  const { latitude, longitude } = stop.location;
  
  // Specifically mark the first stop as user's location with different styling
  let markerColor;
  let markerLabel;
  
  if (index === 0) {
    // Starting point - user's location
    markerColor = 'blue';
    markerLabel = 'S'; // 'S' for Start
  } else if (index <= currentStopIndex) {
    // Completed stops
    markerColor = 'green';
    markerLabel = `${index}`;
  } else {
    // Future stops
    markerColor = 'red';
    markerLabel = `${index}`;
  }
  
  markers.push(`markers=color:${markerColor}|label:${markerLabel}|${latitude},${longitude}`);
  
  // Add to waypoints (skipping first as it's the starting point)
  if (index > 0 && index < validStops.length - 1) {
    waypointsString += `|${latitude},${longitude}`;
  }
});
    
    // Determine center point (current stop or first stop)
    const center = validStops[currentStopIndex >= 0 && currentStopIndex < validStops.length ? 
                             currentStopIndex : 0].location;
    
    // Create Google Maps URL for static map
    const baseMapUrl = `https://www.google.com/maps/embed/v1/view`;
    const mapParams = new URLSearchParams({
      key: GOOGLE_MAPS_API_KEY,
      center: `${center.latitude},${center.longitude}`,
      zoom: 14,
      maptype: 'roadmap'
    });
    
    // If we have multiple stops, use directions
    let finalMapUrl;
    if (validStops.length > 1) {
      const origin = `${validStops[0].location.latitude},${validStops[0].location.longitude}`;
      const destination = `${validStops[validStops.length - 1].location.latitude},${validStops[validStops.length - 1].location.longitude}`;
      
      finalMapUrl = `https://www.google.com/maps/embed/v1/directions?key=${GOOGLE_MAPS_API_KEY}` +
                  `&origin=${origin}` +
                  `&destination=${destination}` +
                  (waypointsString ? `&waypoints=${waypointsString.substring(1)}` : '') +
                  `&mode=${stops[0].transportMode === 'car/taxi' ? 'driving' :
                           stops[0].transportMode === 'public transit' ? 'transit' : 'walking'}`;
    } else {
      finalMapUrl = `${baseMapUrl}?${mapParams.toString()}`;
    }
    
    setMapUrl(finalMapUrl);
  }, [stops, currentStopIndex]);
  
  if (!mapUrl) {
    return <div className="h-64 bg-gray-100 flex items-center justify-center">Map loading...</div>;
  }
  
  return (
    <div className="h-64 md:h-80 rounded-lg overflow-hidden">
      <iframe
        title="Adventure Map"
        width="100%"
        height="100%"
        style={{ border: 0 }}
        loading="lazy"
        allowFullScreen
        src={mapUrl}
      ></iframe>
    </div>
  );
};

export default AdventureMap;