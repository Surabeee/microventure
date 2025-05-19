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
  // Gets nearby location name based on coordinates
const getLocationName = async (latitude, longitude) => {
  try {
    // For simplicity in the MVP, return a standardized label
    // In a production app, this would use reverse geocoding to get actual address
    return 'Your Current Location';
  } catch (error) {
    console.error('Error getting location name:', error);
    return 'Your Current Location';
  }
};
  
  export { getCurrentLocation, getLocationName };