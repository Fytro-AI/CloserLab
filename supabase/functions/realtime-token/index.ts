import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// (keep all your PERSONA_PROMPTS, DIFFICULTY_PROMPTS, INDUSTRY_PROMPTS,
//  buildDiscoveryPrompt, buildMeetingSetterPrompt, clampText functions exactly as-is)
// ...

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("subscription_tier, is_pro, monthly_voice_minutes, last_voice_month")
      .eq("user_id", userData.user.id)
      .single();

    const hasProAccess = profile?.subscription_tier === "pro" || profile?.is_pro === true;
    if (!hasProAccess) {
      return new Response(JSON.stringify({ error: "Pro subscription required for voice calls" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const currentMonth = new Date().toISOString().slice(0, 7);
    const usedThisMonth = profile.last_voice_month === currentMonth
      ? (profile.monthly_voice_minutes ?? 0)
      : 0;
    if (usedThisMonth >= 180) {
      return new Response(JSON.stringify({ error: "Monthly voice limit reached (180 min). Resets on the 1st." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "Service configuration error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();

    const sdpOffer          = body.sdpOffer as string;
    const persona           = clampText(body.persona, 50) || "skeptical";
    const industry          = clampText(body.industry, 50) || "saas";
    const difficulty        = clampText(body.difficulty, 50) || "medium";
    const simulationMode    = clampText(body.simulationMode, 50) || "discovery";
    const prospectName      = clampText(body.prospectName, 100);
    const prospectCompany   = clampText(body.prospectCompany, 200);
    const prospectBackstory = clampText(body.prospectBackstory, 500);
    const challengeSystemPrompt     = clampText(body.challengeSystemPrompt, 2000);
    const customIndustryDescription = clampText(body.customIndustryDescription, 1000);

    if (!sdpOffer) {
      return new Response(JSON.stringify({ error: "sdpOffer is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fullInstructions = simulationMode === "meeting-setter"
      ? buildMeetingSetterPrompt({ persona, industry, difficulty, prospectName, prospectCompany, prospectBackstory, customIndustryDescription })
      : buildDiscoveryPrompt({ persona, industry, difficulty, prospectName, prospectCompany, prospectBackstory, challengeSystemPrompt, customIndustryDescription });

    const sessionConfig = {
      type: "realtime",
      model: "gpt-realtime",
      voice: "verse",
      instructions: fullInstructions,
      input_audio_transcription: { model: "gpt-4o-transcribe" },
      turn_detection: {
        type: "server_vad",
        threshold: 0.5,
        prefix_padding_ms: 300,
        silence_duration_ms: 1400,
        create_response: false,
      },
      max_response_output_tokens: 300,
    };

    const fd = new FormData();
    fd.set("sdp", sdpOffer);
    fd.set("session", JSON.stringify(sessionConfig));

    const response = await fetch("https://api.openai.com/v1/realtime/calls", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: fd,
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("OpenAI realtime calls error:", err);
      return new Response(JSON.stringify({ error: "Failed to create voice session" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sdpAnswer = await response.text();

    return new Response(JSON.stringify({ sdp_answer: sdpAnswer }), {
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