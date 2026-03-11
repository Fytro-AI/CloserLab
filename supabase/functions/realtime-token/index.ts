import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── Auth check ────────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Pro tier check ────────────────────────────────────────────────────────
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("subscription_tier")
      .eq("user_id", userData.user.id)
      .single();

    if (profile?.subscription_tier !== "pro") {
      return new Response(JSON.stringify({ error: "Pro subscription required for voice calls" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "Service configuration error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Parse request body ────────────────────────────────────────────────────
    const body = await req.json();
    const { systemPrompt } = body;

    if (!systemPrompt || typeof systemPrompt !== "string" || systemPrompt.length > 8000) {
      return new Response(JSON.stringify({ error: "Invalid system prompt" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Append the critical buyer waiting instruction ─────────────────────────
    const fullInstructions = `${systemPrompt}

CRITICAL ROLE REMINDER:
You are the BUYER receiving this sales call. You are NOT the seller.
- Do NOT speak first. Sit in silence until the seller speaks.
- Do NOT pitch anything. Do NOT talk about any product or service.
- When you hear the seller's voice for the first time, respond ONLY with a natural phone pickup line such as: "Hello?", "Yeah?", "Yep?", "Go ahead.", "Talk to me.", "Who's this?" — nothing more.
- Wait for the seller to introduce themselves and make their pitch before you react to anything.
- You have NO product to sell. You are evaluating whether to BUY from the seller who called you.`;

    // ── Create ephemeral session with OpenAI ──────────────────────────────────
    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-realtime-preview",
        voice: "ash",
        instructions: fullInstructions,
        input_audio_transcription: {
          model: "whisper-1",
        },
        turn_detection: {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 700,
          create_response: false,
        },
        max_response_output_tokens: 300,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("OpenAI realtime session error:", err);
      return new Response(JSON.stringify({ error: "Failed to create voice session" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const session = await response.json();

    return new Response(JSON.stringify({
      client_secret: session.client_secret,
      session_id: session.id,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (e) {
    console.error("realtime-token error:", e);
    return new Response(JSON.stringify({ error: "An error occurred. Please try again." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});