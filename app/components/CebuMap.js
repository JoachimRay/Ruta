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

  function LocationMarker() {
    useMapEvents({
      click(e) {
        setDestination([e.latlng.lat, e.latlng.lng]);
      },
    });
    return destination ? <Marker position={destination}></Marker> : null;
  }

  return (
    <MapContainer
      center={userPosition || [10.3157, 123.8854]} // Cebu default
      zoom={13}
      style={{ height: "80vh", width: "100%" }}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {userPosition && <Marker position={userPosition}></Marker>}
      <LocationMarker />
    </MapContainer>
  );
}
