import Geocoder from 'react-native-geocoding';
import { GOOGLE_API_KEY } from '../../services/config';


// Initialize the geocoder with your Google Maps API key
// Make sure to enable Geocoding API in your Google Cloud Console
Geocoder.init(GOOGLE_API_KEY);

export const reverseGeocode = async (latitude: number, longitude: number): Promise<string> => {
  try {
    // Check if coordinates are valid (not 0.0000, 0.0000 or very close to 0)
    if (Math.abs(latitude) < 0.001 && Math.abs(longitude) < 0.001) {
      return 'Unknown Location';
    }

    const response = await Geocoder.from(latitude, longitude);
    
    if (response.results && response.results.length > 0) {
      const result = response.results[0];
      
      // Try to get a meaningful address
      const addressComponents = result.address_components;
      
      // Look for street number + route (street name)
      const streetNumber = addressComponents.find(comp => 
        comp.types.includes('street_number')
      )?.long_name;
      
      const route = addressComponents.find(comp => 
        comp.types.includes('route')
      )?.long_name;
      
      const neighborhood = addressComponents.find(comp => 
        comp.types.includes('neighborhood') || comp.types.includes('sublocality')
      )?.long_name;
      
      const city = addressComponents.find(comp => 
        comp.types.includes('locality')
      )?.long_name;
      
      // Build address in order of preference
      if (streetNumber && route) {
        return `${streetNumber} ${route}`;
      } else if (route) {
        return route;
      } else if (neighborhood) {
        return neighborhood;
      } else if (city) {
        return city;
      } else {
        // Fallback to formatted address
        return result.formatted_address || 'Unknown Location';
      }
    }
    
    return 'Unknown Location';
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return 'Unknown Location';
  }
};

// Alternative using native iOS/Android geocoding (no API key needed)
import { NativeModules } from 'react-native';

export const reverseGeocodeNative = async (latitude: number, longitude: number): Promise<string> => {
  try {
    // Check if coordinates are valid
    if (Math.abs(latitude) < 0.001 && Math.abs(longitude) < 0.001) {
      return 'Unknown Location';
    }

    // You can use react-native-geocoder for native geocoding
    // npm install react-native-geocoder
    const Geocoder = NativeModules.Geocoder;
    
    const result = await Geocoder.geocodePosition({
      lat: latitude,
      lng: longitude,
    });
    
    if (result && result.length > 0) {
      const address = result[0];
      
      // Build meaningful address
      if (address.streetNumber && address.streetName) {
        return `${address.streetNumber} ${address.streetName}`;
      } else if (address.streetName) {
        return address.streetName;
      } else if (address.subLocality) {
        return address.subLocality;
      } else if (address.locality) {
        return address.locality;
      } else {
        return address.formattedAddress || 'Unknown Location';
      }
    }
    
    return 'Unknown Location';
  } catch (error) {
    console.error('Native reverse geocoding error:', error);
    return 'Unknown Location';
  }
};

// Utility to detect if a string looks like coordinates
export const isCoordinateString = (str: string): boolean => {
  if (!str) return false;
  
  // Check for patterns like "Location 0.0000, 0.0000" or "3.12313, 4.12314"
  const coordinatePattern = /^(?:Location\s+)?-?\d+\.?\d*,\s*-?\d+\.?\d*$/;
  return coordinatePattern.test(str.trim());
};

// Extract coordinates from coordinate string
export const extractCoordinates = (str: string): { lat: number; lng: number } | null => {
  try {
    // Remove "Location " prefix if present
    const cleanStr = str.replace(/^Location\s+/, '');
    
    // Split by comma and parse
    const parts = cleanStr.split(',').map(part => parseFloat(part.trim()));
    
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return {
        lat: parts[0],
        lng: parts[1]
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting coordinates:', error);
    return null;
  }
};