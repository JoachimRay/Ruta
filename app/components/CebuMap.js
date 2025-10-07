"use client";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import { useState, useEffect } from "react";
import L from "leaflet";

// Simple icon fix for Next.js + Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export default function CebuMap() {
  const [userPosition, setUserPosition] = useState(null);
  const [destination, setDestination] = useState(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserPosition([pos.coords.latitude, pos.coords.longitude]);
        },
        (err) => console.error(err),
        { enableHighAccuracy: true }
      );
    }
  }, []);


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
    // destination may be [lat, lng] or [lat, lng, display_name]
    return destination ? <Marker position={[destination[0], destination[1]]}></Marker> : null;
  }

// stray top-level fetch removed; reverse geocode is called when the user clicks the map


  // Copy coordinates to clipboard
  const copyCoords = () => {
    if (!destination) return;
    const text = `${destination[0]},${destination[1]}`;
    if (navigator.clipboard) navigator.clipboard.writeText(text);
    console.log("Copied pin coords:", text);
  };

  // Export current pin as JSON file for terminal reading
  const exportPin = () => {
    if (!destination) return;
    
    const pin = { lat: destination[0], lng: destination[1], createdAt: new Date().toISOString() };
    const data = JSON.stringify([pin], null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ruta-pin.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const logPin = () => {
    if (!destination) return;
    console.log("Pinned at:", destination[0], destination[1]);
  };

  return (
    <div style={{ position: "relative" }}>
      <div style={{ position: "absolute", top: 12, left: 12, zIndex: 1000, background: "rgba(255,255,255,0.95)", padding: 8, borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Last pin</div>
        {destination ? (
          <div style={{ fontSize: 13 }}>
            <div style={{ fontWeight: 700 }}>{destination[2] ?? "Pinned location"}</div>
            <div style={{ color: "#333", marginBottom: 6 }}>{destination[0].toFixed(6)}, {destination[1].toFixed(6)}</div>
            <div style={{ marginTop: 6, display: "flex", gap: 6 }}>
              <button onClick={copyCoords} style={{ fontSize: 12 }}>Copy</button>
              <button onClick={exportPin} style={{ fontSize: 12 }}>Export</button>
              <button onClick={logPin} style={{ fontSize: 12 }}>Log</button>
            </div>
          </div>
        ) : (
          <div style={{ color: "#666" }}>Click the map to add a pin</div>
        )}
      </div>

      <MapContainer
        center={userPosition || [10.3157, 123.8854]} // Cebu default
        zoom={13}
        style={{ height: "80vh", width: "100%" }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}.png"
        />
        {userPosition && <Marker position={userPosition}></Marker>}
        <LocationMarker />
      </MapContainer>
    </div>
  );
}
