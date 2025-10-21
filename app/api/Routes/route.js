// Simple Next.js App Router POST handler that proxies reverse geocoding to Nominatim

import {NextResponse} from "next/server"; 
import {fileContents} from "../../../utils/Get_Data.ts"; 
import { Get_Prompts } from "../../../utils/Get_Data.ts";

const CACHE = new Map();
const USER_AGENT = "RutaApp/1.0 (joachim@example.com)"; // replace with your contact


// -----------------GeoCode Decoder--------------- 
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



// -----------------------AI Wrapper------------------------


export async function POST(req) 
{

  try{ 
  const {query} = await req.json(); 
  const prompt = Get_Prompts("route_prompt");



  const completion = await openai.chat.completions.create({
    mode: 'gpt-4o',
    messages: [
      { 
        role: 'system',
        content: prompt
      }, 
      {
        role: 'user', 
        content: query// Get the users location query 
      }
    ]
  })



  // Checks if response has any results 
  const response = completion.choices[0]?.message?.content 

  console.log("Generated Response: ", response ? "Success":"Failed"); 

  if(response) 
  {
    console.log("Raw AI output preview: ", response.substring(0,200) + '...'); 
  }



  

// Catches error if no response is generated
  } catch(error){ 
    console.error("API Error:", error)
    return NextResponse.json( 
      {error: 'Internal Server Error', details: error instanceof Error ? error.message : "Unknown Error"},
      {status: 500}
    )
  }

}