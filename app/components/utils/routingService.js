// ===================================================================
// ROUTING SERVICE UTILITY
// ===================================================================
/**
 * Handles route calculation and polyline decoding for navigation
 * 
 * This module provides a robust routing system with multiple API fallbacks
 * and handles the complexity of different routing service formats.
 */

/**
 * Fetches driving route between two points using multiple routing services
 * 
 * This function implements a robust routing system with multiple fallbacks:
 * 1. Primary: OSRM (Open Source Routing Machine) - Free, reliable, good coverage
 * 2. Secondary: GraphHopper - Commercial service with good road following
 * 3. Fallback: Straight line - When all APIs fail
 * 
 * @param {Array} start - Starting coordinates [latitude, longitude]
 * @param {Array} end - Destination coordinates [latitude, longitude]
 * @returns {Promise<Array>} - Array of coordinate points for the route
 */
export const fetchRoute = async (start, end) => {
  // ===================================================================
  // INPUT VALIDATION
  // ===================================================================
  if (!start || !end) {
    console.log("Missing start or end coordinates:", { start, end });
    throw new Error("Missing start or end coordinates");
  }
  
  console.log("Fetching route from:", start, "to:", end);
  
  // ===================================================================
  // PRIMARY ROUTING: OSRM API
  // ===================================================================
  // OSRM (Open Source Routing Machine) provides free, high-quality routing
  // It uses OpenStreetMap data and is excellent for road following
  try {
    // Build OSRM API URL
    // Format: /route/v1/driving/lng1,lat1;lng2,lat2?parameters
    // Note: OSRM expects longitude,latitude (opposite of our internal format)
    const url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`;
    console.log("OSRM API URL:", url);
    
    // Make the API request
    const response = await fetch(url);
    console.log("API Response status:", response.status);
    
    // ===================================================================
    // PROCESS OSRM RESPONSE
    // ===================================================================
    if (response.ok) {
      const data = await response.json();
      console.log("Route data received:", data);
      
      // Check if we got valid route data
      if (data.routes && data.routes.length > 0) {
        // Extract coordinates from GeoJSON format
        // OSRM returns coordinates as [longitude, latitude], we need [latitude, longitude]
        const coordinates = data.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
        console.log("Setting route coordinates:", coordinates.length, "points");
        
        console.log("Route fetched successfully with OSRM");
        return coordinates; // Success! Return coordinates
      } else {
        throw new Error("No routes found in response");
      }
    } else {
      throw new Error(`OSRM API error: ${response.status}`);
    }
  } catch (error) {
    console.error("OSRM failed, trying GraphHopper:", error);

    // ===================================================================
    // SECONDARY ROUTING: GRAPHHOPPER API
    // ===================================================================
    // If OSRM fails, try GraphHopper as backup
    // GraphHopper is a commercial service but has good free tier
    try {
      // Build GraphHopper API URL
      // Format: /route?point=lat1,lng1&point=lat2,lng2&vehicle=car&key=apikey
      const graphHopperUrl = `https://graphhopper.com/api/1/route?point=${start[0]},${start[1]}&point=${end[0]},${end[1]}&vehicle=car&key=8b1a7ab7-52de-4c29-a9cc-b5d2ba3b2983`;
      console.log("GraphHopper API URL:", graphHopperUrl);
      
      const ghResponse = await fetch(graphHopperUrl);
      
      if (ghResponse.ok) {
        const ghData = await ghResponse.json();
        console.log("GraphHopper data received:", ghData);
        
        // Check if we got valid path data
        if (ghData.paths && ghData.paths.length > 0) {
          // GraphHopper returns encoded polyline that needs decoding
          const points = ghData.paths[0].points;
          const coordinates = decodePolyline(points);
          console.log("Setting GraphHopper route coordinates:", coordinates.length, "points");
          console.log("Route fetched successfully with GraphHopper");
          return coordinates; // Success! Return coordinates
        } else {
          throw new Error("No paths found in GraphHopper response");
        }
      } else {
        throw new Error(`GraphHopper API error: ${ghResponse.status}`);
      }
    } catch (ghError) {
      console.error("GraphHopper also failed:", ghError);
      
      // ===================================================================
      // FINAL FALLBACK: STRAIGHT LINE
      // ===================================================================
      // If both routing services fail, draw a straight line
      // This ensures users always get some visual feedback
      console.log("Using fallback straight line");
      return [start, end];
    }
  }
};

/**
 * Decodes compressed polyline strings into coordinate arrays
 * 
 * Background: Routing APIs like GraphHopper return routes as "encoded polylines"
 * to save bandwidth. These are compressed strings that represent hundreds of
 * coordinate points along a route. This function expands them back into
 * latitude/longitude pairs that can be drawn on the map.
 * 
 * The algorithm uses Google's Polyline Algorithm:
 * 1. Coordinates are stored as integers (multiplied by 10^precision)
 * 2. Sequential coordinates are delta-encoded (only differences stored)
 * 3. Values are encoded using a special base-32 encoding
 * 
 * Example: "_p~iF~ps|U_ulLnnqC_mqNvxq`@" becomes hundreds of [lat,lng] points
 * 
 * @param {string} str - Encoded polyline string from routing API
 * @param {number} precision - Decimal precision (usually 5 or 6)
 * @returns {Array} - Array of [latitude, longitude] coordinate pairs
 */
export const decodePolyline = (str, precision = 5) => {
  // Initialize variables for decoding process
  let index = 0;           // Current position in the encoded string
  let lat = 0;             // Running latitude value (accumulates deltas)
  let lng = 0;             // Running longitude value (accumulates deltas)  
  let coordinates = [];    // Final array of coordinate pairs
  let shift = 0;           // Bit shifting for decoding
  let result = 0;          // Temporary result during decoding
  let byte = null;         // Current byte being processed
  let latitude_change;     // Delta change in latitude
  let longitude_change;    // Delta change in longitude
  let factor = Math.pow(10, precision); // Factor to convert back to decimal coordinates

  // Process each character in the encoded string
  while (index < str.length) {
    
    // ===================================================================
    // DECODE LATITUDE DELTA
    // ===================================================================
    byte = null;
    shift = 0;
    result = 0;

    // Read bytes until we get a complete value (when byte < 0x20)
    do {
      byte = str.charCodeAt(index++) - 63; // Convert character to 6-bit value
      result |= (byte & 0x1f) << shift;    // Accumulate bits (0x1f = 31 = 0b11111)
      shift += 5;                          // Each iteration adds 5 bits
    } while (byte >= 0x20);                // Continue if more bytes needed (0x20 = 32)

    // Convert from signed integer representation
    latitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));

    // ===================================================================
    // DECODE LONGITUDE DELTA  
    // ===================================================================
    shift = 0;
    result = 0;

    // Same process for longitude
    do {
      byte = str.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    longitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));

    // ===================================================================
    // ACCUMULATE AND STORE COORDINATE
    // ===================================================================
    // Add deltas to running totals (this is why it's called delta encoding)
    lat += latitude_change;
    lng += longitude_change;

    // Convert back to decimal degrees and store
    coordinates.push([lat / factor, lng / factor]);
  }

  return coordinates;
};