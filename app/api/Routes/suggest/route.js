// Server route for AI-based jeepney route suggestions.
// This file runs on the server (Next.js App Router API route) and never ships to the browser.
// The code below integrates with OpenAI, reads local data/prompt files, and returns a structured JSON suggestion.

import OpenAI from 'openai'; // Official OpenAI SDK for Node.js
import fs from 'fs'; // Node.js filesystem module for reading local files
import path from 'path'; // Node.js path utilities for cross-OS safe file paths

// Initialize OpenAI client
// - The API key is read from process.env.OPENAI_API_KEY (set it in .env.local at project root)
// - Environment variables from .env.local are loaded by Next.js at build/dev time and available on the server
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Add this to your .env.local file
});

// Read the jeepney route data
// - Data/ai_data.json contains curated jeepney routes for Cebu City
// - process.cwd() resolves to the project root at runtime
// - We synchronously read and parse JSON (fast, small file); async is also fine if preferred
function getJeepneyRoutes() {
  const filePath = path.join(process.cwd(), 'Data', 'ai_data.json');
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(fileContent);
}

// Read the system prompt
// - The system prompt sets the behavior and constraints for the AI model
// - Stored as Markdown for easier authoring and version control
function getSystemPrompt() {
  const filePath = path.join(process.cwd(), 'app', 'api', 'prompt', 'mainprompt.md');
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  return fileContent;
}

export async function POST(req) {
  try {
    // Parse JSON body sent by the client
    // Expected shape:
    // {
    //   fromLocation: [lat:number, lng:number, name?:string],
    //   toLocation:   [lat:number, lng:number, name?:string]
    // }
    const body = await req.json();
    const { fromLocation, toLocation } = body;

    // Validate inputs
    // We require both origin (fromLocation) and destination (toLocation)
    if (!fromLocation || !toLocation) {
      return new Response(
        JSON.stringify({ error: 'fromLocation and toLocation are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Basic coordinate format guard: ensure [0] (lat) and [1] (lng) exist and are truthy values
    // Note: 0 (zero) is a valid number but falsy; if you expect latitude/longitude of exactly 0,
    // consider changing this check to use typeof === 'number' instead of truthiness.
    if (!fromLocation[0] || !fromLocation[1] || !toLocation[0] || !toLocation[1]) {
      return new Response(
        JSON.stringify({ error: 'Invalid coordinates format' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Load jeepney routes
    const jeepneyRoutes = getJeepneyRoutes();
    
    // Load system prompt
    const systemPrompt = getSystemPrompt();

    // Create user message with location data and routes
    // We use a JavaScript template literal (backticks `...`) to build a readable multi-line string.
    // Inside a template literal, the syntax ${ ... } performs expression interpolation.
    // - "${fromLocation[0]}" means: evaluate the expression fromLocation[0] and convert it to a string.
    // - You can put any JavaScript expression inside ${ }, e.g. function calls, ternaries, arithmetic.
    // - The entire string is assembled at runtime from these pieces.
    const userMessage = `
User_Current_Location: ${fromLocation[0]}, ${fromLocation[1]}
${fromLocation[2] ? `Current Location Name: ${fromLocation[2]}` : ''}

Destination_Location: ${toLocation[0]}, ${toLocation[1]}
${toLocation[2] ? `Destination Name: ${toLocation[2]}` : ''}

Here are the available jeepney routes in Cebu City:
${JSON.stringify(jeepneyRoutes, null, 2)}

Please suggest the best jeepney route(s) to get from the current location to the destination.
`;

    console.log('Calling OpenAI API...');

    // Call OpenAI API
    // chat.completions.create parameters:
    // - model: the model name. 'gpt-4o-mini' balances quality and cost/latency; 'gpt-3.5-turbo' is cheaper but less capable.
    // - messages: a list of role-based messages: system (instructions), user (question/prompt), assistant (model replies)
    // - temperature: 0.0–2.0; higher = more creative/varied, lower = more deterministic
    // - response_format: { type: 'json_object' } asks the model to reply with strict JSON we can parse safely
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // or 'gpt-3.5-turbo' for cheaper option
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userMessage
        }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" } // Ensure JSON response
    });

    // The OpenAI SDK returns a completion with choices; we take the first choice's message content.
    const aiResponse = completion.choices[0].message.content;
    console.log('OpenAI response:', aiResponse);

    // Parse the AI response
    // Because we requested response_format: json_object, the content should be valid JSON text.
    // If the model returns invalid JSON (rare but possible), JSON.parse will throw and be caught below.
    const suggestion = JSON.parse(aiResponse);

    return new Response(
      JSON.stringify({
        success: true,
        suggestion: suggestion,
        usage: {
          // Token usage is useful for monitoring costs; may be undefined for some models/responses
          prompt_tokens: completion.usage.prompt_tokens,
          completion_tokens: completion.usage.completion_tokens,
          total_tokens: completion.usage.total_tokens
        }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in suggest-route API:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to get route suggestion', 
        // Expose only a safe, high-level message to clients; do not leak sensitive details in production
        details: error.message 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
