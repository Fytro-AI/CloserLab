import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import OpenAI from "npm:openai";

const client = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") });

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VALID_PERSONAS = ["skeptical", "aggressive", "distracted", "budget", "time-starved"];
const VALID_DIFFICULTIES = ["easy", "medium", "hard", "nightmare"];
const VALID_INDUSTRIES = ["saas", "plumbing", "coaching", "ecommerce", "agency", "macro-intelligence", "real-estate", "recruiting", "consulting"];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- Authentication ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Input Validation ---
    const body = await req.json();
    const { transcript, industry, difficulty, persona } = body;

    if (!Array.isArray(transcript) || transcript.length === 0 || transcript.length > 200) {
      return new Response(JSON.stringify({ error: "Invalid transcript" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    for (const m of transcript) {
      if (!m.role || !["user", "assistant"].includes(m.role) || typeof m.content !== "string" || m.content.length > 5000) {
        return new Response(JSON.stringify({ error: "Invalid transcript format" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const safeIndustry = VALID_INDUSTRIES.includes(industry) ? industry : "saas";
    const safeDifficulty = VALID_DIFFICULTIES.includes(difficulty) ? difficulty : "medium";
    const safePersona = VALID_PERSONAS.includes(persona) ? persona : "skeptical";

    // Check if user said anything at all
    const userMessages = transcript.filter((m: { role: string }) => m.role === "user");
    if (userMessages.length === 0) {
      return new Response(JSON.stringify({ error: "No speech detected. Try the call again and speak into your mic." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- System prompt ---
    const systemPrompt = `You are an elite sales coach analyzing a sales call transcript. The seller was practicing against a ${safePersona} buyer in the ${safeIndustry} industry at ${safeDifficulty} difficulty.

You must respond with ONLY a valid JSON object (no markdown, no code blocks, no extra text). Use this exact structure:

{
  "overall_score": <0-100>,
  "confidence_score": <0-100>,
  "objection_handling_score": <0-100>,
  "clarity_score": <0-100>,
  "closing_score": <0-100>,
  "strengths": ["<specific strength 1>", "<specific strength 2>"],
  "weaknesses": ["<specific weakness 1>", "<specific weakness 2>"],
  "missed_opportunities": ["<specific missed opportunity>"],
  "improvement_tip": "<one direct, aggressive coaching tip>"
}

SCORING GUIDELINES:
- Be HARSH but fair. Most calls should score 40-70.
- Score above 80 only for genuinely excellent performance.
- Score below 30 for terrible performance.
- Each strength/weakness must reference SPECIFIC moments from the transcript.
- The improvement_tip should be direct and slightly aggressive in tone.`;

    const transcriptText = transcript
      .map((m: { role: string; content: string }) =>
        `${m.role === "user" ? "SELLER" : "BUYER"}: ${m.content}`
      )
      .join("\n");

    // --- Call OpenAI GPT for scoring ---
    const aiResp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Here is the full transcript:\n\n${transcriptText}\n\nAnalyze this call and return the JSON scoring.` },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    const content = aiResp.choices?.[0]?.message?.content ?? "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      console.error("AI response could not be parsed:", content);
      return new Response(JSON.stringify({ error: "Failed to parse AI scoring" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const scores = JSON.parse(jsonMatch[0]);
    return new Response(JSON.stringify(scores), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("score-call error:", e);
    return new Response(JSON.stringify({ error: "An internal error occurred. Please try again." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});