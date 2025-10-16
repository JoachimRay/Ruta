"use client";
// This file is a client-only React component that renders a Leaflet map
// using react-leaflet. It depends on browser-only globals like `navigator`
// and `document`, so keep it client-only via the directive above.
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents } from "react-leaflet";
import { useState, useEffect, useRef } from "react";
import L from "leaflet";

//Get users location from this file
// import the helper from the same folder
import { getLocation } from "./UserLocation";
// Next.js + Leaflet integration note:
// Leaflet looks for marker image assets relative to its own package by
// default. In SSR or some bundlers the paths may not resolve, leaving the
// default marker icons broken. Overriding the default URLs to CDN-hosted
// images is a simple workaround that keeps marker visuals working.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Main map component: handles geolocation, click-to-pin (reverse geocode),
// and route drawing. The component keeps lightweight local state and relies
// on a small server endpoint (/api/reverse) to convert coordinates into
// human-readable addresses.
export default function CebuMap() {

  // ALL OF THESE ARE STATE VARIABLES TO STORE DATA
  // Murag siya int value = 0 sa C++
  const [userPosition, setUserPosition] = useState(null);
  const [geoError, setGeoError] = useState(null);
  const [userPositionAccuracy, setUserPositionAccuracy] = useState(null);
  const [destination, setDestination] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [fromLocation, setFromLocation] = useState(null);
  const [toLocation, setToLocation] = useState(null);
  const [routeMode, setRouteMode] = useState(null); // 'from' or 'to'
  // ref to the Leaflet map instance so we can programmatically change view
  const mapRef = useRef(null);

  useEffect(() => {
    // Try to get a reasonably accurate fix (watchPosition-backed helper).
    // We prefer accuracy <= 50m and will wait up to 10s for it.
    getLocation(50, 10000).then((loc) => {
      if (loc && loc.length >= 4) {
        // loc: [lat, lng, label, accuracy]
        setUserPosition([loc[0], loc[1]]);
        setUserPositionAccuracy(loc[3]);
      } else if (loc && loc.length >= 2) {
        setUserPosition([loc[0], loc[1]]);
        setUserPositionAccuracy(null);
      } else {
        setGeoError('Unable to obtain geolocation');
      }
    }).catch((e) => {
      console.error('getLocation helper error', e);
      setGeoError(String(e));
    });
  }, []);

  

  

  // If userPosition becomes available and the user hasn't pinned a location
  // yet (destination is empty), auto-set the pin so the map shows the
  // user's current location immediately.
  useEffect(() => {
    if (userPosition && !destination) {
      const loc = [userPosition[0], userPosition[1], 'Current location'];
      setDestination(loc);
      setFromLocation(loc);
      setRouteMode('from');
      try {
        const map = mapRef.current;
        if (map && map.setView) map.setView([loc[0], loc[1]], map.getZoom() || 13);
      } catch (e) {}
    }
  }, [userPosition]);

  // When destination changes, move the map view to center on the new pin.
  useEffect(() => {
    if (!destination) return;
    try {
      const map = mapRef.current;
      if (map && map.setView) {
        map.setView([destination[0], destination[1]], map.getZoom() || 13);
      }
    } catch (e) {
      // ignore if map isn't ready yet
    }
  }, [destination]);

  // Arguments of start(user's current location) and end (pinned location)
  const fetchRoute = async (start, end) => {

    if (!start || !end) {
      console.log("Missing start or end coordinates:", { start, end });
      return;
    }
    
    console.log("Fetching route from:", start, "to:", end);
    
    // Pass coordinates to OSRM API to find a route
    try {
      // Try OSRM (Open Source Routing Machine) - better road following
      const url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`;
      console.log("OSRM API URL:", url);
      
      const response = await fetch(url);
      console.log("API Response status:", response.status);
      
      // Check response from OSRM API and pass to Polyline if valid
      if (response.ok) {
        const data = await response.json();
        console.log("Route data received:", data);
        
        if (data.routes && data.routes.length > 0) {
          const coordinates = data.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
          console.log("Setting route coordinates:", coordinates.length, "points");
          setRouteCoordinates(coordinates);
          console.log("Route fetched successfully with OSRM");
        } else {
          throw new Error("No routes found in response");
        }
      } else {
        throw new Error(`OSRM API error: ${response.status}`);
      }
    } catch (error) {
      console.error("OSRM failed, trying GraphHopper:", error);

      // Fallback to GraphHopper API if OSRM fails
      try {
        const graphHopperUrl = `https://graphhopper.com/api/1/route?point=${start[0]},${start[1]}&point=${end[0]},${end[1]}&vehicle=car&key=8b1a7ab7-52de-4c29-a9cc-b5d2ba3b2983`;
        console.log("GraphHopper API URL:", graphHopperUrl);
        
        const ghResponse = await fetch(graphHopperUrl);
        
        if (ghResponse.ok) {
          const ghData = await ghResponse.json();
          console.log("GraphHopper data received:", ghData);
          
          if (ghData.paths && ghData.paths.length > 0) {
            // Decode GraphHopper polyline
            const points = ghData.paths[0].points;
            const coordinates = decodePolyline(points);
            console.log("Setting GraphHopper route coordinates:", coordinates.length, "points");
            setRouteCoordinates(coordinates);
            console.log("Route fetched successfully with GraphHopper");
          } else {
            throw new Error("No paths found in GraphHopper response");
          }
        } else {
          throw new Error(`GraphHopper API error: ${ghResponse.status}`);
        }
      } catch (ghError) {
        console.error("GraphHopper also failed:", ghError);
        // Final fallback: draw a straight line
        console.log("Using fallback straight line");
        setRouteCoordinates([start, end]);
      }
    }
  };

  // Simple polyline decoder for GraphHopper or OSMR 
  // Polyline is basically the lines that make up the route
  const decodePolyline = (str, precision = 5) => {
    let index = 0, lat = 0, lng = 0, coordinates = [], shift = 0, result = 0, byte = null, latitude_change, longitude_change, factor = Math.pow(10, precision);

    while (index < str.length) {
      byte = null;
      shift = 0;
      result = 0;

      do {
        byte = str.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);

      latitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));

      shift = result = 0;

      do {
        byte = str.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);

      longitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));

      lat += latitude_change;
      lng += longitude_change;

      coordinates.push([lat / factor, lng / factor]);
    }

    return coordinates;
  };


  // Function for storing data for "From location"
  const setFromPoint = () => {
    // If we already have the user's geolocation from state, use that as From.
    if (userPosition) {
      // Move the active pin (destination) to the user's current location
      setDestination([userPosition[0], userPosition[1], 'Current location']);
      setFromLocation([userPosition[0], userPosition[1], 'Current location']);
      setRouteMode('from');
      console.log("From location set from userPosition:", userPosition);
      return;
    }

    // Otherwise try the exported helper which returns a Promise.
    getLocation().then((loc) => {
      if (loc) {
        // Also move the active pin to the obtained location so the user
        // immediately sees the pin at their current position.
        setDestination(loc);  
        setFromLocation(loc);
        setRouteMode('from');
        console.log("From location set from getLocation():", loc);
      } else {
        console.log("Could not obtain user location");
      }
    });
  };

  // Function for storing data for "To location"   

  const setToPoint = () => {
    if (destination) {
      setToLocation([destination[0], destination[1], destination[2] || "To location"]);
      setRouteMode('to');
      console.log("To location set:", destination);
    } else {
      console.log("Pin a location first, then click 'Set To'");
    }
  };

  // Function to show the route on the map, this only runs after OSRM or graphhopper fetches the route
  const showRoute = () => {

    if (fromLocation && toLocation) {
      console.log("Showing route from:", fromLocation, "to:", toLocation);
      fetchRoute([fromLocation[0], fromLocation[1]], [toLocation[0], toLocation[1]]);
    } else {
      console.log("Please set both From and To locations first");
    }
  };




  // Pin marker on map click
  function LocationMarker() {
    useMapEvents({
      click(e) {
        const lat = e.latlng.lat; // latitude
        const lng = e.latlng.lng; // longitude
        setDestination([lat, lng]); 
        // call server to reverse geocode
        fetch("/api/reverse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat, lng }),
        })
          .then((r) => r.json())
          .then((data) => {
            if (data.display_name) {
              console.log("Address:", data.display_name);
              // attach display name to destination state via a simple approach: store as part of destination
              setDestination([lat, lng, data.display_name]);
            } else {
              console.warn("Reverse geocode returned no display_name", data);
            }
          })
          .catch((err) => console.error("Reverse geocode failed", err));
      },
    });

    
    return (
      <>
        {/* Current pin marker */}
        {destination ? <Marker position={[destination[0], destination[1]]}></Marker> : null}
        
        {/* From location marker (green) */}
        {fromLocation && (
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
        {toLocation && (
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



  // Sets the variables to Null to clear out for the next input
  const clearRoute = () => {
    setRouteCoordinates([]);
    setFromLocation(null);
    setToLocation(null);
    setRouteMode(null);
    console.log("Route and all route points cleared");
  };



  // This is where the visuals are HTML, CSS, JS
  return ( 

    <div style={{ position: "relative" }}>
      <div style={{ position: "absolute", top: -90, left: 880, zIndex: 1000, background: "grey", padding: 8, borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Route Planning</div>
        
        {/* From Location */}
        <div style={{ fontSize: 13, marginBottom: 8 }}>
          <div style={{ fontWeight: 700, color: "#4CAF50" }}>From:</div>
          {fromLocation ? (
            <div style={{ color: "#333" }}>
              <div>{fromLocation[2] || "From location"}</div>
              <div style={{ fontSize: 11 }}>{fromLocation[0].toFixed(6)}, {fromLocation[1].toFixed(6)}</div>
            </div>
          ) : (
            <div style={{ color: "#666", fontSize: 11 }}>Not set</div>
          )}
        </div>
        
        {/* To Location */}
        <div style={{ fontSize: 13, marginBottom: 8 }}>
          <div style={{ fontWeight: 700, color: "#f44336" }}>To:</div>
          {toLocation ? (
            <div style={{ color: "#333" }}>
              <div>{toLocation[2] || "To location"}</div>
              <div style={{ fontSize: 11 }}>{toLocation[0].toFixed(6)}, {toLocation[1].toFixed(6)}</div>
            </div>
          ) : (
            <div style={{ color: "#666", fontSize: 11 }}>Not set</div>
          )}
        </div>
        
        {/* Current Pin */}
        {destination && (
          <div style={{ fontSize: 13, borderTop: "1px solid #eee", paddingTop: 8 }}>
            <div style={{ fontWeight: 700 }}>Current Pin:</div>
            <div style={{ color: "#333" }}>
              <div>{destination[2] ?? "Pinned location"}</div>
              <div style={{ fontSize: 11 }}>{destination[0].toFixed(6)}, {destination[1].toFixed(6)}</div>
            </div>
          </div>
        )}
        
        {!destination && (
          <div style={{ color: "#666", fontSize: 11, fontStyle: "italic" }}>
            Click the map to pin a location, then use buttons to set From/To points
          </div>
        )}
      </div>

     {/*Route Control buttons*/}
      <div style ={{display: "flex", gap:6, color: "#fff", flexWrap: "wrap"}}> 
        <button onClick={setFromPoint} style = {{fontSize: 15, backgroundColor: "#4CAF50", border: "none", padding: "8px 12px", borderRadius: "4px", color: "white"}}> Current Location </button>
  
        <button onClick={setToPoint} style = {{fontSize: 15, backgroundColor: "#f44336", border: "none", padding: "8px 12px", borderRadius: "4px", color: "white"}}> Set To </button>
        <button onClick={showRoute} style = {{fontSize: 15, backgroundColor: "#2196F3", border: "none", padding: "8px 12px", borderRadius: "4px", color: "white"}}> Show Route </button>
        <button onClick={clearRoute} style = {{fontSize: 15, backgroundColor: "#666", border: "none", padding: "8px 12px", borderRadius: "4px", color: "white"}}> Clear Route </button>
        </div>

        {/* Debug panel - visible during development to help trace state */}
        <div style={{ marginTop: 8, fontSize: 12, color: '#222' }}>
          <div><strong>Debug</strong></div>
          <div>UserPosition: {userPosition ? `${userPosition[0].toFixed(6)}, ${userPosition[1].toFixed(6)}` : 'null'}</div>
          <div>Destination: {destination ? `${destination[0].toFixed(6)}, ${destination[1].toFixed(6)} (${destination[2] ?? ''})` : 'null'}</div>
          <div>Accuracy: {userPositionAccuracy != null ? `${userPositionAccuracy} m` : 'unknown'}</div>
          <div>GeoError: {geoError ?? 'none'}</div>
        </div>

      <MapContainer
        center={userPosition || [10.3157, 123.8854]} // Cebu default
        zoom={13}
        style={{ height: "80vh", width: "100%" }}
        whenCreated={(mapInstance) => { mapRef.current = mapInstance; }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}.png"
        />
        {userPosition && <Marker position={userPosition}></Marker>}
        <LocationMarker />
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
// oten