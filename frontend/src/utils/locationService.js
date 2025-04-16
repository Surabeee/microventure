// Gets the user's current location using the browser's Geolocation API
const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }
  
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        (error) => {
          let errorMessage = 'Unknown error occurred while retrieving location.';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location permission was denied.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information is unavailable.';
              break;
            case error.TIMEOUT:
              errorMessage = 'The request to get location timed out.';
              break;
          }
          
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  };
  
  // Gets nearby location name based on coordinates
  const getLocationName = async (latitude, longitude) => {
    try {
      // In a real app, you'd use a reverse geocoding service here
      // For MVP, we'll just return the coordinates for display
      return `Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
    } catch (error) {
      console.error('Error getting location name:', error);
      return 'Current Location';
    }
  };
  
  export { getCurrentLocation, getLocationName };