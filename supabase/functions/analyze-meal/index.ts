// Supabase Edge Function: analyze-meal
// Proxies meal photo analysis to OpenAI GPT-4o Vision so the API key never ships in the client bundle.
// Deploy: supabase functions deploy analyze-meal
// Secret:  supabase secrets set OPENAI_API_KEY=sk-...

import { corsHeaders } from '../_shared/cors.ts';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') ?? '';

const SYSTEM_PROMPT =
  'You are a nutrition expert. Analyse this food photo and return ONLY valid JSON with these fields: ' +
  'meal_name (string), calories (integer), protein_g (number), carbs_g (number), fat_g (number), ' +
  'fiber_g (number), iron_mg (number), confidence ("high"|"medium"|"low"). ' +
  'Estimate for a single serving. No markdown, no extra text.';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { image } = await req.json();
    if (!image || typeof image !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing "image" (base64) in request body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 400,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: SYSTEM_PROMPT },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${image}`, detail: 'low' } },
            ],
          },
        ],
      }),
    });

    if (!openaiResponse.ok) {
      const errText = await openaiResponse.text();
      return new Response(JSON.stringify({ error: `OpenAI error ${openaiResponse.status}: ${errText}` }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const json = await openaiResponse.json();
    const content: string = json.choices[0].message.content.trim();
    const cleaned = content.replace(/```json\n?|```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
