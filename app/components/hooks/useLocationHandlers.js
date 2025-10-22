// ===================================================================
// LOCATION HANDLERS HOOK
// ===================================================================
/**
 * Custom React hook that manages From/To location setting logic
 * 
 * This hook encapsulates all the complex logic for setting route points,
 * including protection mechanisms and reverse geocoding.
 */

import { reverseGeocode, getAISuggestion } from '../utils/geocodingService.js';

/**
 * Custom hook for handling From/To location operations
 * 
 * @param {Object} params - Hook parameters
 * @param {Array|null} params.destination - Current pinned location
 * @param {Array|null} params.fromLocation - Current from location
 * @param {Function} params.setFromLocation - Function to update from location
 * @param {Array|null} params.toLocation - Current to location  
 * @param {Function} params.setToLocation - Function to update to location
 * @param {Function} params.setRouteMode - Function to set route mode
 * @param {Function} params.setAiSuggestion - Function to set AI suggestion
 * @param {Function} params.setLoadingAI - Function to set AI loading state
 * @param {Function} params.setAiError - Function to set AI error state
 */
export const useLocationHandlers = ({
  destination,
  fromLocation,
  setFromLocation,
  toLocation, 
  setToLocation,
  setRouteMode,
  setAiSuggestion,
  setLoadingAI,
  setAiError
}) => {

  // ===================================================================
  // FROM LOCATION SETTING FUNCTION
  // ===================================================================
  /**
   * Sets the current pinned location as the "From" (starting) point for routing
   * 
   * This function implements a protection mechanism to prevent accidental
   * overwriting of carefully chosen From locations. Once set, the From location
   * can only be changed by clearing the entire route first.
   */
  const setFromPoint = async () => {
    // Protection: Prevent overwriting existing From location
    if (fromLocation) {
      console.log("From location is already set. Click 'Clear Route' first if you want to change it.");
      return;
    }

    // Validation: Ensure a location is currently pinned
    if (!destination || destination[0] === undefined || destination[1] === undefined) { 
      console.log("Pin a location first, then click 'Set From'");
      return;
    }

    const lat = destination[0];
    const lng = destination[1];
    
    // Immediate update: Set From location with available data
    setFromLocation([lat, lng, destination[2] || "From Location"]); 
    setRouteMode('from');
    console.log("From Location set:", destination);
    
    // Reverse geocoding: Get full address for better UX
    try {
      const formattedAddress = await reverseGeocode(lat, lng);
      if (formattedAddress) {
        setFromLocation([lat, lng, formattedAddress]);
      }
    } catch (err) {
      console.error("Reverse geocode failed for From location", err);
    }
  };

  // ===================================================================
  // TO LOCATION SETTING FUNCTION  
  // ===================================================================
  /**
   * Sets the current pinned location as the "To" (destination) point for routing
   * 
   * This function mirrors setFromPoint() but for the destination location.
   * It implements the same protection mechanism and reverse geocoding process.
   */
  const setToPoint = async () => {
    // Protection: Prevent overwriting existing To location
    if (toLocation) {
      console.log("To location is already set. Click 'Clear Route' first if you want to change it.");
      return;
    }

    // Validation: Ensure a location is currently pinned
    if (!destination || destination[0] === undefined || destination[1] === undefined) { 
      console.log("Pin a location first, then click 'Set To'");
      return;
    }

    const lat = destination[0];
    const lng = destination[1];
    
    // Immediate update: Set To location with available data
    setToLocation([lat, lng, destination[2] || "To Location"]); 
    setRouteMode('to');
    console.log("To Location set:", destination);
    
    // Reverse geocoding: Get full address for better UX
    try {
      const formattedAddress = await reverseGeocode(lat, lng);
      if (formattedAddress) {
        setToLocation([lat, lng, formattedAddress]);
      }
    } catch (err) {
      console.error("Reverse geocode failed for To location", err);
    }
  };

  // ===================================================================
  // AI SUGGESTION FUNCTION
  // ===================================================================
  /**
   * Gets AI-powered jeepney route suggestions between From and To locations
   */
  const handleGetAISuggestion = async () => {
    if (!fromLocation || !toLocation) {
      setAiError("Please set both From and To locations first");
      return;
    }

    setLoadingAI(true);
    setAiError(null);
    
    try {
      const suggestion = await getAISuggestion(fromLocation, toLocation);
      setAiSuggestion(suggestion);
    } catch (error) {
      setAiError(error.message || "Failed to get route suggestion");
    } finally {
      setLoadingAI(false);
    }
  };

  return {
    setFromPoint,
    setToPoint,
    handleGetAISuggestion
  };
};