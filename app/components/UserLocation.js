"use client";
import { useState } from "react";

// UserLocation component
// - Calls `onSetFrom([lat, lng, label])` when the user's location is obtained.
// - Keeps minimal UI: a button to request location and simple error/loading state.
export default function UserLocation({ onSetFrom }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const getLocation = () => {
        if (!navigator.geolocation) {
            setError("Geolocation is not supported by your browser");
            return;
        }

        setLoading(true);
        setError(null);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLoading(false);
                const { latitude, longitude } = position.coords;
                // If parent provided a callback, call it with the coordinates.
                if (typeof onSetFrom === "function") {
                    onSetFrom([latitude, longitude, "My location"]);
                }
            },
            (err) => {
                setLoading(false);
                setError("User denied location access or an error occurred");
                console.error(err);
            },
            { enableHighAccuracy: true }
        );
    };

    return (
        <div>
            <button onClick={getLocation} disabled={loading} style={{ padding: '6px 10px' }}>
                {loading ? 'Locating…' : 'Use my location as From'}
            </button>
            {error && <div style={{ color: 'red', marginTop: 6 }}>{error}</div>}
        </div>
    );
}

// Convenience helper: returns a Promise that resolves to [lat, lng, label]
// or null if the location couldn't be obtained. This lets other components
// (like CebuMap) call getLocation() directly without rendering the UI.
export function getLocation(threshold = 50, maxWait = 15000) {
    // threshold: desired horizontal accuracy in meters
    // maxWait: maximum milliseconds to wait for a better accuracy
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            resolve(null);
            return;
        }

        let best = null;
        let done = false;

        const clear = (watchId, timer) => {
            try { navigator.geolocation.clearWatch(watchId); } catch (e) {}
            if (timer) clearTimeout(timer);
        };

        const watchId = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude, accuracy } = position.coords;
                // store best so far
                if (!best || (accuracy != null && accuracy < (best[3] ?? Infinity))) {
                    best = [latitude, longitude, 'Current location', accuracy ?? null];
                }

                // If accuracy is good enough, finish early
                if (accuracy != null && accuracy <= threshold && !done) {
                    done = true;
                    clear(watchId, timer);
                    resolve(best);
                }
            },
            (err) => {
                // On error, stop and resolve with best if available
                console.error('watchPosition error', err);
                if (!done) {
                    done = true;
                    clear(watchId, timer);
                    resolve(best);
                }
            },
            { enableHighAccuracy: true, maximumAge: 0 }
        );

        // stop after maxWait and return best we have (could be null)
        const timer = setTimeout(() => {
            if (!done) {
                done = true;
                clear(watchId, null);
                resolve(best);
            }
        }, maxWait);
    });
}

