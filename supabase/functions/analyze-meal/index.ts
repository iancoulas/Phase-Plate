// Supabase Edge Function: analyze-meal
// Proxies meal photo analysis to OpenAI GPT-4o Vision so the API key never ships in the client bundle.
// Deploy: supabase functions deploy analyze-meal
// Secret:  supabase secrets set OPENAI_API_KEY=sk-...

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

// Client downsamples to quality 0.6 before base64-encoding; a legitimate photo
// is well under this. Caps abuse via oversized repeated payloads.
const MAX_IMAGE_BASE64_LENGTH = 8_000_000; // ~6MB raw

// verify_jwt only confirms the caller holds *a* valid Supabase JWT (the public
// anon key qualifies) — this is the real guard against unbounded OpenAI billing.
// Photo nutrition logging is a free-tier feature (VISION.md), so this caps the
// free daily allotment rather than gating on subscription tier.
const DAILY_CALL_LIMIT = 1;

// verify_jwt already checked the signature before invoking this function, so it's
// safe to read the "sub" claim without re-verifying — this is for usage tracking,
// not an auth decision.
function getUserIdFromAuthHeader(req: Request): string | null {
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  const payloadSegment = token.split('.')[1];
  if (!payloadSegment) return null;
  try {
    const padded = payloadSegment.replace(/-/g, '+').replace(/_/g, '/').padEnd(payloadSegment.length + (4 - (payloadSegment.length % 4)) % 4, '=');
    const payload = JSON.parse(atob(padded));
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

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
    if (image.length > MAX_IMAGE_BASE64_LENGTH) {
      return new Response(JSON.stringify({ error: 'Image too large' }), {
        status: 413,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = getUserIdFromAuthHeader(req);
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: callCount, error: usageError } = await supabaseAdmin.rpc('increment_analyze_meal_usage', {
      p_user_id: userId,
    });
    if (usageError) {
      console.error(`usage tracking error: ${usageError.message}`);
    } else if (callCount > DAILY_CALL_LIMIT) {
      return new Response(JSON.stringify({ error: 'Daily meal analysis limit reached. Try again tomorrow.' }), {
        status: 429,
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
      console.error(`OpenAI error ${openaiResponse.status}: ${errText}`);
      return new Response(JSON.stringify({ error: 'Meal analysis failed. Please try again.' }), {
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
