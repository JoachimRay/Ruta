// ===================================================================
// ADDRESS FORMATTING UTILITY
// ===================================================================
/**
 * Utilities for cleaning up and formatting addresses from geocoding APIs
 * 
 * This module handles the complexity of making verbose API addresses
 * user-friendly and concise for display in the UI.
 */

/**
 * Cleans up verbose address strings from geocoding APIs to show only essential parts
 * 
 * Example Input: "123 Colon Street, Barangay Kalunasan, Cebu City, Cebu, Central Visayas, 6000, Philippines"
 * Example Output: "123 Colon Street, Barangay Kalunasan, Cebu City"
 * 
 * @param {string} fullAddress - Complete address string from reverse geocoding
 * @returns {string|null} - Cleaned, shortened address or null if no address provided
 */
export const formatAddress = (fullAddress) => {
  // Early return if no address provided
  if (!fullAddress) return null;
  
  // Step 1: Split the address by commas and clean each part
  // Remove leading/trailing whitespace and filter out empty strings
  const parts = fullAddress
    .split(',')                    // Split by comma separator
    .map(part => part.trim())      // Remove whitespace from each part
    .filter(part => part);         // Remove empty parts
  
  // Step 2: Define patterns for information we don't want to display
  // These are common in Philippine addresses but not useful for users
  const unwantedPatterns = [
    /^\d{4,}$/,           // Postal codes (just numbers with 4+ digits)
    /^Philippines?$/i,    // Country name (we know we're in PH)
    /^Cebu$/i,            // Province name (redundant if already in Cebu)
    /^Region VII/i,       // Administrative region
    /^Central Visayas/i,  // Regional grouping
    /^Visayas$/i,         // Island group name
  ];
  
  // Step 3: Filter out unwanted parts using the patterns above
  const filtered = parts.filter(part => {
    // Check if this part matches any unwanted pattern
    return !unwantedPatterns.some(pattern => pattern.test(part));
  });
  
  // Step 4: Take only the most relevant parts (street/building, area, city)
  // Limit to 3 parts to keep display manageable
  const relevant = filtered.slice(0, 3);
  
  // Step 5: Return formatted address based on what we found
  if (relevant.length >= 2) {
    // We have multiple relevant parts, join them with commas
    return relevant.join(', ');
  } else if (relevant.length === 1) {
    // Only one relevant part found
    return relevant[0];
  }
  
  // Step 6: Fallback - if our filtering was too aggressive
  // Use first 2 parts of original or the full address as last resort
  return parts.slice(0, 2).join(', ') || fullAddress;
};

/**
 * Truncates long addresses to fit in UI components
 * 
 * @param {string} address - Address to truncate
 * @param {number} maxLength - Maximum character length
 * @returns {string} - Truncated address with ellipsis if needed
 */
export const truncateAddress = (address, maxLength = 50) => {
  if (!address) return '';
  if (address.length <= maxLength) return address;
  
  return address.substring(0, maxLength - 3) + '...';
};

/**
 * Extracts just the main location name from a full address
 * (First part before the first comma)
 * 
 * @param {string} fullAddress - Complete address string
 * @returns {string} - Just the primary location name
 */
export const getLocationName = (fullAddress) => {
  if (!fullAddress) return '';
  
  const firstPart = fullAddress.split(',')[0]?.trim();
  return firstPart || fullAddress;
};