// Simple Next.js App Router POST handler that proxies reverse geocoding to Nominatim
const CACHE = new Map();
const USER_AGENT = "RutaApp/1.0 (joachim@example.com)"; // replace with your contact

export async function POST(req) {
  try {
    const body = await req.json();
    const lat = Number(body.lat);
    const lng = Number(body.lng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return new Response(JSON.stringify({ error: "lat and lng required" }), { status: 400 });
    }

    const key = `${lat.toFixed(6)},${lng.toFixed(6)}`;
    if (CACHE.has(key)) {
      return new Response(JSON.stringify({ source: "cache", ...CACHE.get(key) }), { status: 200 });
    }

    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=en`;
    const resp = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
      },
    });

    if (!resp.ok) {
      return new Response(JSON.stringify({ error: "nominatim error", status: resp.status }), { status: 502 });
    }

    const data = await resp.json();
    const payload = { display_name: data.display_name, address: data.address || {}, raw: data };
    CACHE.set(key, payload);
    // very short TTL for dev
    setTimeout(() => CACHE.delete(key), 60 * 1000);

    return new Response(JSON.stringify({ source: "nominatim", ...payload }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
}
