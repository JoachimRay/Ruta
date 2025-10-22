// ===================================================================
// LOCATION MARKER COMPONENT
// ===================================================================
/**
 * Handles map click events and renders different types of location markers
 * 
 * This component manages:
 * - Click-to-pin functionality 
 * - Current pin marker (blue)
 * - From location marker (green)
 * - To location marker (red)
 * - Reverse geocoding on click
 */

"use client";

import { Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { reverseGeocode } from '../utils/geocodingService.js';

/**
 * LocationMarker component that handles map interactions and marker display
 * 
 * @param {Object} props - Component props
 * @param {Array|null} props.destination - Current pin location [lat, lng, address]
 * @param {Function} props.setDestination - Function to update destination
 * @param {Array|null} props.fromLocation - From location [lat, lng, address]
 * @param {Array|null} props.toLocation - To location [lat, lng, address]
 */
export default function LocationMarker({ 
  destination, 
  setDestination, 
  fromLocation, 
  toLocation 
}) {
  
  // ===================================================================
  // MAP CLICK HANDLER
  // ===================================================================
  /**
   * Handles clicks on the map to pin new locations
   * 
   * When user clicks the map:
   * 1. Extract coordinates from click event
   * 2. Set temporary pin immediately (for fast UI response)
   * 3. Make reverse geocoding request to get address
   * 4. Update pin with full address information
   */
  useMapEvents({
    click(e) {
      const lat = e.latlng.lat; // Extract latitude from click event
      const lng = e.latlng.lng; // Extract longitude from click event
      
      // Set pin immediately with coordinates only (fast UI response)
      setDestination([lat, lng]); 
      console.log(`Map clicked at: ${lat}, ${lng}`);
      
      // Fetch address in background and update when ready
      reverseGeocode(lat, lng)
        .then((formattedAddress) => {
          if (formattedAddress) {
            // Update destination with the formatted address
            setDestination([lat, lng, formattedAddress]);
          }
        })
        .catch((err) => {
          console.error("Failed to get address for clicked location:", err);
          // Keep the pin even if geocoding fails
        });
    },
  });

  // ===================================================================
  // MARKER RENDERING
  // ===================================================================
  return (
    <>
      {/* CURRENT PIN MARKER (Blue - Default) */}
      {destination && destination[0] !== undefined && destination[1] !== undefined ? (
        <Marker position={[destination[0], destination[1]]}></Marker>
      ) : null}
      
      {/* FROM LOCATION MARKER (Green) */}
      {fromLocation && fromLocation[0] !== undefined && fromLocation[1] !== undefined && (
        <Marker 
          position={[fromLocation[0], fromLocation[1]]}
          icon={L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
          })}
        />
      )}
      
      {/* TO LOCATION MARKER (Red) */}
      {toLocation && toLocation[0] !== undefined && toLocation[1] !== undefined && (
        <Marker 
          position={[toLocation[0], toLocation[1]]}
          icon={L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
          })}
        />
      )}
    </>
  );
}