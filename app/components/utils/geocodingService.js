// ===================================================================
// GEOCODING SERVICE UTILITY
// ===================================================================
/**
 * Handles reverse geocoding (coordinates to addresses) via API
 * 
 * This module abstracts the complexity of making geocoding requests
 * and provides a clean interface for converting coordinates to addresses.
 */

import { formatAddress } from './addressFormatter.js';

/**
 * Converts coordinates to a human-readable address
 * 
 * @param {number} lat - Latitude coordinate
 * @param {number} lng - Longitude coordinate
 * @returns {Promise<string|null>} - Formatted address or null if failed
 */
export const reverseGeocode = async (lat, lng) => {
  try {
    console.log(`Reverse geocoding coordinates: ${lat}, ${lng}`);
    
    const response = await fetch("/api/Routes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat, lng }),
    });

    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.display_name) {
      const formattedAddress = formatAddress(data.display_name);
      console.log(`Geocoded address: ${formattedAddress}`);
      return formattedAddress;
    } else {
      console.warn("Reverse geocode returned no display_name", data);
      return null;
    }
  } catch (error) {
    console.error("Reverse geocode failed:", error);
    return null;
  }
};

/**
 * Gets AI-powered jeepney route suggestions between two locations
 * 
 * @param {Array} fromLocation - Starting location [lat, lng, address]
 * @param {Array} toLocation - Destination location [lat, lng, address]
 * @returns {Promise<Object|null>} - AI suggestion object or null if failed
 */
export const getAISuggestion = async (fromLocation, toLocation) => {
  try {
    console.log("Requesting AI jeepney route suggestion...");
    
    const response = await fetch("/api/Routes/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromLocation, toLocation }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.success) {
      console.log("AI suggestion received:", data.suggestion);
      return data.suggestion;
    } else {
      throw new Error(data.error || "Failed to get suggestion");
    }
  } catch (error) {
    console.error("Error getting AI suggestion:", error);
    throw error;
  }
};