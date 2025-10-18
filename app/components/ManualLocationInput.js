"use client";
import { useState } from "react";

export default function ManualLocationInput({ onSetLocation }) {
    const [input, setInput] = useState("");
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        try {
            let lat, lng;

            // Check if coordinates are entered
            if (/^\s*-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\s*$/.test(input)) {
                [lat, lng] = input.split(",").map(Number);
            } else {
                // Treat as address and geocode
                const resp = await fetch("/api/geocode", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ address: input }),
                });
                const data = await resp.json();
                if (!data.lat || !data.lng) throw new Error("Address not found");
                lat = data.lat;
                lng = data.lng;
            }

            onSetLocation([lat, lng, input]);
            setInput("");
        } catch (err) {
            setError(err.message || "Invalid input");
        }
    };

    return (
        <form onSubmit={handleSubmit} style={{ marginBottom: 8 }}>
            <input
                type="text"
                placeholder="Enter coordinates (lat,lng) or address"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                style={{ padding: 6, width: 250, marginRight: 6 }}
            />
            <button type="submit" style={{ padding: "6px 10px" }}>Set Location</button>
            {error && <div style={{ color: 'red', marginTop: 4 }}>{error}</div>}
        </form>
    );
}
