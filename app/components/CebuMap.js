// ===================================================================
// MAIN CEBU MAP COMPONENT - CLEAN & ORGANIZED
// ===================================================================
/**
 * CebuMap - Interactive mapping component for route planning in Cebu
 * 
 * This is a cleaned up version of the original CebuMap component.
 * All functionality is preserved but organized better for maintainability.
 */

"use client";

// ===================================================================
// IMPORTS
// ===================================================================
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents } from "react-leaflet";
import { useState, useEffect, useRef } from "react";
import L from "leaflet";
import { getLocation } from "./UserLocation";

// ===================================================================
// LEAFLET ICON FIX
// ===================================================================
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ===================================================================
// UTILITY FUNCTIONS
// ===================================================================

/**
 * Formats addresses to show only essential parts
 */
const formatAddress = (fullAddress) => {
  if (!fullAddress) return null;
  
  const parts = fullAddress.split(',').map(part => part.trim()).filter(part => part);
  const unwantedPatterns = [
    /^\d{4,}$/, /^Philippines?$/i, /^Cebu$/i, /^Region VII/i, /^Central Visayas/i, /^Visayas$/i,
  ];
  
  const filtered = parts.filter(part => !unwantedPatterns.some(pattern => pattern.test(part)));
  const relevant = filtered.slice(0, 3);
  
  if (relevant.length >= 2) return relevant.join(', ');
  if (relevant.length === 1) return relevant[0];
  return parts.slice(0, 2).join(', ') || fullAddress;
};

/**
 * Fetches route between two points with fallback
 */
const fetchRouteData = async (start, end) => {
  if (!start || !end) throw new Error("Missing coordinates");
  
  try {
    // Primary: OSRM API
    const url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`;
    const response = await fetch(url);
    
    if (response.ok) {
      const data = await response.json();
      if (data.routes && data.routes.length > 0) {
        return data.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
      }
    }
    throw new Error("OSRM failed");
  } catch (error) {
    console.warn("Route API failed, using fallback:", error);
    // Fallback: straight line
    return [start, end];
  }
};

/**
 * Reverse geocoding function
 */
const reverseGeocode = async (lat, lng) => {
  try {
    const response = await fetch("/api/Routes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat, lng }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.display_name) {
        return formatAddress(data.display_name);
      }
    }
    return null;
  } catch (error) {
    console.error("Reverse geocoding failed:", error);
    return null;
  }
};

// ===================================================================
// MAIN COMPONENT
// ===================================================================
export default function CebuMap() {
  // ===================================================================
  // STATE VARIABLES
  // ===================================================================
  const [userPosition, setUserPosition] = useState(null);
  const [geoError, setGeoError] = useState(null);
  const [userPositionAccuracy, setUserPositionAccuracy] = useState(null);
  const [destination, setDestination] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [fromLocation, setFromLocation] = useState(null);
  const [toLocation, setToLocation] = useState(null);
  const [routeMode, setRouteMode] = useState(null);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiError, setAiError] = useState(null);
  const mapRef = useRef(null);
  const [showModal, setShowModal] = useState(true);

  // ===================================================================
  // LOCATION HANDLERS
  // ===================================================================
  const useGeolocation = () => {
    setShowModal(false);
    getLocation(50, 10000).then((loc) => {
      if (loc && loc.length >= 4) {
        setUserPosition([loc[0], loc[1]]);
        setUserPositionAccuracy(loc[3]);
        setDestination([loc[0], loc[1], 'Current location']);
        setFromLocation([loc[0], loc[1], 'Current location']);
        setRouteMode('from');
      } else if (loc && loc.length >= 2) {
        setUserPosition([loc[0], loc[1]]);
        setUserPositionAccuracy(null);
        setDestination([loc[0], loc[1], 'Current location']);
        setFromLocation([loc[0], loc[1], 'Current location']);
        setRouteMode('from');
      } else {
        setGeoError('Unable to obtain geolocation');
      }
    }).catch((e) => {
      console.error('getLocation helper error', e);
      setGeoError(String(e));
    });
  };

  const useManualSelection = () => {
    setShowModal(false);
  };

  // ===================================================================
  // FROM/TO LOCATION FUNCTIONS
  // ===================================================================
  const setFromPoint = async () => {
    if (fromLocation) {
      console.log("From location already set. Clear route first to change.");
      return;
    }

    if (!destination || destination[0] === undefined || destination[1] === undefined) { 
      console.log("Pin a location first, then click 'Set From'");
      return;
    }

    const lat = destination[0];
    const lng = destination[1];
    
    setFromLocation([lat, lng, destination[2] || "From Location"]); 
    setRouteMode('from');
    
    // Get full address via reverse geocoding
    const address = await reverseGeocode(lat, lng);
    if (address) {
      setFromLocation([lat, lng, address]);
    }
  };

  const setToPoint = async () => {
    if (toLocation) {
      console.log("To location already set. Clear route first to change.");
      return;
    }

    if (!destination || destination[0] === undefined || destination[1] === undefined) { 
      console.log("Pin a location first, then click 'Set To'");
      return;
    }

    const lat = destination[0];
    const lng = destination[1];
    
    setToLocation([lat, lng, destination[2] || "To Location"]); 
    setRouteMode('to');
    
    // Get full address via reverse geocoding
    const address = await reverseGeocode(lat, lng);
    if (address) {
      setToLocation([lat, lng, address]);
    }
  };

  // ===================================================================
  // ROUTE FUNCTIONS
  // ===================================================================
  const showRoute = async () => {
    if (!fromLocation || !toLocation) {
      console.log("Please set both From and To locations first");
      return;
    }

    try {
      const coordinates = await fetchRouteData(
        [fromLocation[0], fromLocation[1]], 
        [toLocation[0], toLocation[1]]
      );
      setRouteCoordinates(coordinates);
    } catch (error) {
      console.error("Failed to fetch route:", error);
    }
  };

  const clearRoute = () => {
    setRouteCoordinates([]);
    setFromLocation(null);
    setToLocation(null);
    setRouteMode(null);
    setAiSuggestion(null);
    setAiError(null);
    console.log("Route cleared");
  };

  // ===================================================================
  // AI SUGGESTION FUNCTION
  // ===================================================================
  const getAISuggestion = async () => {
    if (!fromLocation || !toLocation) {
      setAiError("Please set both From and To locations first");
      return;
    }

    setLoadingAI(true);
    setAiError(null);
    
    try {
      const response = await fetch("/api/Routes/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromLocation, toLocation }),
      });

      const data = await response.json();
      
      if (data.success) {
        setAiSuggestion(data.suggestion);
      } else {
        setAiError(data.error || "Failed to get suggestion");
      }
    } catch (error) {
      console.error("Error getting AI suggestion:", error);
      setAiError("Failed to get route suggestion");
    } finally {
      setLoadingAI(false);
    }
  };

  // ===================================================================
  // LOCATION MARKER COMPONENT
  // ===================================================================
  function LocationMarker() {
    useMapEvents({
      click: async (e) => {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;
        setDestination([lat, lng]); 
        
        // Get address via reverse geocoding
        const address = await reverseGeocode(lat, lng);
        if (address) {
          setDestination([lat, lng, address]);
        }
      },
    });

    return (
      <>
        {/* Current pin marker */}
        {destination && destination[0] !== undefined && destination[1] !== undefined ? (
          <Marker position={[destination[0], destination[1]]}></Marker>
        ) : null}
        
        {/* From location marker (green) */}
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
        
        {/* To location marker (red) */}
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

  // ===================================================================
  // SIDE EFFECTS
  // ===================================================================
  useEffect(() => {
    // Auto-center map on new destinations
    if (!destination) return;
    
    try {
      const map = mapRef.current;
      if (map && map.setView) {
        map.setView([destination[0], destination[1]], map.getZoom() || 13);
      }
    } catch (e) {
      // Ignore errors during map initialization
    }
  }, [destination]);

  // ===================================================================
  // RENDER
  // ===================================================================
  return (
    <div style={{ position: "relative" }}>
      {/* Hide Leaflet zoom controls */}
      <style jsx global>{`
        .leaflet-control-zoom { display: none !important; }
      `}</style>

      {/* Initial location selection modal */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.6)', zIndex: 2000, display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div style={{
            background: '#fff', padding: '24px', borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)', maxWidth: '400px',
            width: '100%', textAlign: 'center'
          }}>
            <h2 style={{ marginTop: 0, marginBottom: '16px', color: '#333', fontSize: 'clamp(18px, 5vw, 24px)' }}>
              Set Starting Location
            </h2>
            <p style={{ marginBottom: '24px', color: '#666', fontSize: 'clamp(14px, 3.5vw, 16px)' }}>
              How would you like to set your "From" location?
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={useGeolocation} style={{
                fontSize: 'clamp(13px, 3.5vw, 15px)', backgroundColor: '#4CAF50',
                border: 'none', padding: '12px 20px', borderRadius: '6px',
                color: 'white', cursor: 'pointer', fontWeight: 600,
                flex: '1 1 auto', minWidth: '140px'
              }}>
                Use My Location
              </button>
              <button onClick={useManualSelection} style={{
                fontSize: 'clamp(13px, 3.5vw, 15px)', backgroundColor: '#2196F3',
                border: 'none', padding: '12px 20px', borderRadius: '6px',
                color: 'white', cursor: 'pointer', fontWeight: 600,
                flex: '1 1 auto', minWidth: '140px'
              }}>
                Choose on Map
              </button>
            </div>
          </div>
        </div>
      )}

      {/* From/To Location Panel */}
      <div style={{
        width: 390, height: 200, backgroundColor: "#1C1C1C",
        position: "absolute", top: 0, left: "0%", zIndex: 999, borderRadius: 16
      }}>
        <div style={{ color: "white", fontSize: '15px', paddingTop: "20px", paddingLeft: "50px" }}>
          From:
        </div>
        
        {/* From Button */}
        <div style={{padding: 20, display: 'flex', justifyContent: 'center', paddingTop: 50}}>
          <button onClick={setFromPoint} style={{
            fontSize: 'clamp(12px, 1vw, 15px)',
            backgroundColor: fromLocation ? "#4CAF50" : "#1c1c1c",
            border: "none", padding: "8px 12px", borderRadius: "4px",
            cursor: fromLocation ? "not-allowed" : "pointer",
            width: '200px', height: '40px', overflow: "hidden",
            color: fromLocation ? "white" : "yellow", font: "bold",
            opacity: fromLocation ? 0.7 : 1
          }}>
            {fromLocation && fromLocation[2] ? fromLocation[2] : (destination && destination[2] ? destination[2] : 'Set From')}
          </button>
        </div>

        {/* To Button */}
        <div style={{padding: 20, display: 'flex', justifyContent: 'center', paddingTop: 10}}> 
          <button onClick={setToPoint} style={{
            fontSize: 'clamp(12px, 3vw, 15px)',
            backgroundColor: toLocation ? "#f44336" : "#666",
            border: "none", padding: "8px 12px", borderRadius: "4px",
            color: "white", cursor: toLocation ? "not-allowed" : "pointer",
            width: '200px', height: '40px', opacity: toLocation ? 0.7 : 1
          }}>
            {toLocation && toLocation[2] ? toLocation[2] : (destination && destination[2] ? destination[2] : 'Set To')}
          </button>
        </div>

        {/* AI Suggestion Button */}
        <div style={{padding: 20, display: 'flex', justifyContent: 'center', paddingTop: 10}}> 
          <button onClick={getAISuggestion} disabled={!fromLocation || !toLocation || loadingAI} style={{
            fontSize: 'clamp(12px, 1vw, 15px)',
            backgroundColor: loadingAI ? "#999" : "#FF9800",
            border: "none", padding: "8px 12px", borderRadius: "4px", color: "white",
            cursor: loadingAI || !fromLocation || !toLocation ? "not-allowed" : "pointer",
            width: '200px', height: '40px', opacity: !fromLocation || !toLocation ? 0.5 : 1
          }}>
            {loadingAI ? 'Getting Suggestion...' : '🚍 Suggest Jeepney Route'}
          </button>
        </div>
      </div>

      {/* Route Control Panel */}
      <div style={{
        width: 390, height: 300, backgroundColor: "#1C1C1C",
        position: "absolute", bottom: 0, left: "0%", zIndex: 999, borderRadius: 16
      }}>
        {/* AI Suggestion Display */}
        {aiSuggestion && (
          <div style={{
            padding: 20, backgroundColor: '#FFF3E0', borderRadius: 8,
            margin: '10px 20px', border: '2px solid #FF9800'
          }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#E65100' }}>🚍 Jeepney Route Suggestion</h3>
            <p style={{ margin: '5px 0', fontWeight: 'bold', color: '#333' }}>
              {aiSuggestion.route_summary}
            </p>
            {aiSuggestion.steps && aiSuggestion.steps.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <strong>Steps:</strong>
                {aiSuggestion.steps.map((step, index) => (
                  <div key={index} style={{ 
                    marginTop: 8, padding: 8, backgroundColor: 'white', 
                    borderRadius: 4, fontSize: 14
                  }}>
                    <div><strong>Jeepney:</strong> {step.jeepney}</div>
                    <div><strong>From:</strong> {step.from}</div>
                    <div><strong>To:</strong> {step.to}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* AI Error Display */}
        {aiError && (
          <div style={{
            padding: 15, backgroundColor: '#FFEBEE', borderRadius: 8,
            margin: '10px 20px', color: '#C62828', fontSize: 14
          }}>
            ⚠️ {aiError}
          </div>
        )}

        {/* Control Buttons */}
        <div style={{
          position: "absolute", bottom: '10px', left: '10px', right: '10px',
          zIndex: 1000, display: "flex", gap: 6, color: "#fff",
          flexWrap: "wrap", justifyContent: 'center'
        }}>
          <button onClick={showRoute} style={{
            fontSize: 'clamp(12px, 3vw, 15px)', backgroundColor: "#2196F3",
            border: "none", padding: "8px 12px", borderRadius: "4px",
            color: "white", cursor: "pointer", flex: '1 1 auto',
            minWidth: '90px', maxWidth: '140px'
          }}>
            Show Route
          </button>
          
          <button onClick={clearRoute} style={{
            fontSize: 'clamp(12px, 3vw, 15px)', backgroundColor: "#666",
            border: "none", padding: "8px 12px", borderRadius: "4px",
            color: "white", cursor: "pointer", flex: '1 1 auto',
            minWidth: '90px', maxWidth: '140px'
          }}>
            Clear Route
          </button>
        </div>
      </div>

      {/* Main Map */}
      <MapContainer
        center={userPosition || [10.3157, 123.8854]}
        zoom={13}
        style={{ height: "100vh", width: "100%" }}
        whenCreated={(mapInstance) => { mapRef.current = mapInstance; }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}.png"
        />
        
        {/* User position marker */}
        {userPosition && <Marker position={userPosition}></Marker>}
        
        {/* Location markers */}
        <LocationMarker />
        
        {/* Route line */}
        {routeCoordinates.length > 0 && (
          <Polyline 
            positions={routeCoordinates} 
            color="#ff6b6b" 
            weight={4} 
            opacity={0.8}
          />
        )}
      </MapContainer>
    </div>
  );
}