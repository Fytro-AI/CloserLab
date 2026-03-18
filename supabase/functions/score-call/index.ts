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
const VALID_SIMULATION_MODES = ["discovery", "meeting-setter"];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const body = await req.json();
    const { transcript, industry, difficulty, persona, simulationMode } = body;

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
    const safeMode = VALID_SIMULATION_MODES.includes(simulationMode) ? simulationMode : "discovery";

    const userMessages = transcript.filter((m: { role: string }) => m.role === "user");
    if (userMessages.length === 0) {
      return new Response(JSON.stringify({ error: "No speech detected. Try the call again and speak into your mic." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const transcriptText = transcript
      .map((m: { role: string; content: string }) =>
        `${m.role === "user" ? "SELLER" : "BUYER"}: ${m.content}`
      )
      .join("\n");

    // Determine if the meeting was booked (for meeting-setter mode)
    // Check if the last few assistant messages contain booking language or [CALL_ENDED] after a positive response
    const lastAssistantMessages = transcript
      .filter((m: { role: string }) => m.role === "assistant")
      .slice(-3)
      .map((m: { content: string }) => m.content.toLowerCase());

    const meetingBooked = safeMode === "meeting-setter" && lastAssistantMessages.some((msg: string) =>
      /\b(sure|sounds good|let's do it|book|schedule|calendar|send me|tuesday|wednesday|thursday|monday|friday|next week|30 minutes|15 minutes|20 minutes|works for me|that works|i can do|let's set)\b/.test(msg)
    );

    let systemPrompt: string;

    if (safeMode === "meeting-setter") {
      systemPrompt = `You are an elite cold call coach analyzing a meeting-setter call transcript. The seller's ONLY goal was to book a follow-up meeting with a busy prospect who picked up a cold call.

You must respond with ONLY a valid JSON object (no markdown, no code blocks, no extra text). Use this exact structure:

{
  "overall_score": <0-100>,
  "confidence_score": <0-100>,
  "objection_handling_score": <0-100>,
  "clarity_score": <0-100>,
  "closing_score": <0-100>,
  "speed_to_value_score": <0-100>,
  "clarity_of_ask_score": <0-100>,
  "booking_attempt_score": <0-100>,
  "meeting_booked": <true|false>,
  "strengths": ["<specific strength 1>", "<specific strength 2>"],
  "weaknesses": ["<specific weakness 1>", "<specific weakness 2>"],
  "missed_opportunities": ["<specific missed opportunity>"],
  "improvement_tip": "<one direct, aggressive coaching tip>"
}

MEETING SETTER SCORING CRITERIA:

speed_to_value_score (0-100): How fast did the seller connect their offer to a pain the prospect might feel?
- 90-100: Named a specific, relevant problem in the first 1-2 sentences. No fluff.
- 70-89: Got to value within 3-4 sentences with some setup.
- 50-69: Took too long or was too generic.
- Below 50: Pitched product features, not problems. Or took more than 5 turns to get to the point.

clarity_of_ask_score (0-100): Was the meeting ask clear, specific, and low-friction?
- 90-100: Asked for a specific, short meeting with a clear timeframe. "10 minutes next Tuesday?"
- 70-89: Asked for a meeting but vaguely. "We should connect sometime."
- 50-69: Hinted at a next step but never directly asked.
- Below 50: Never asked for a meeting at all, or asked for something too big (e.g., a demo of the full platform).

objection_handling_score (0-100): When the prospect pushed back or expressed doubt, how did the seller respond?
- 90-100: Acknowledged the objection, pivoted cleanly, didn't get defensive.
- 70-89: Handled it but was a bit clunky or took too long.
- Below 50: Got defensive, repeated the same pitch, or ignored the objection.

booking_attempt_score (0-100): Did the seller actively try to book the meeting?
- 100: Asked for the meeting more than once with appropriate persistence.
- 70-89: Asked once, clearly.
- 50-69: Implied a next step but didn't ask directly.
- 0-49: Never asked for the meeting.

confidence_score (0-100): Did the seller sound sure of themselves? No rambling, no over-explaining, no apologizing for calling.

meeting_booked: Set to true if the prospect clearly agreed to a follow-up meeting before the call ended.

SCORING PHILOSOPHY:
- Be HARSH. Cold calling is hard. Most reps score 35-65.
- Score 80+ ONLY if they nailed the pain, asked cleanly, and handled pushback.
- Score below 30 if they pitched product features on a cold call, never asked for a meeting, or rambled.
- Reference SPECIFIC moments from the transcript in strengths/weaknesses.
- The improvement_tip should be one thing they can fix immediately on the next call.`;
    } else {
      systemPrompt = `You are an elite sales coach analyzing a sales call transcript. The seller was practicing against a ${safePersona} buyer in the ${safeIndustry} industry at ${safeDifficulty} difficulty.

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
    }

    const aiResp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Here is the full transcript:\n\n${transcriptText}\n\nAnalyze this call and return the JSON scoring.`,
        },
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

    // Override meeting_booked with our heuristic check if AI didn't set it
    if (safeMode === "meeting-setter" && scores.meeting_booked === undefined) {
      scores.meeting_booked = meetingBooked;
    }

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