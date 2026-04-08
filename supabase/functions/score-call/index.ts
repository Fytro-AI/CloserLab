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
const VALID_INDUSTRIES = ["saas", "plumbing", "coaching", "ecommerce", "agency", "macro-intelligence", "real-estate", "recruiting", "consulting", "healthcare"];
const VALID_SIMULATION_MODES = ["discovery", "meeting-setter", "interview"];

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
    const { transcript, industry, difficulty, persona, simulationMode, interviewRole, interviewCompany } = body;

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
        `${m.role === "user" ? (safeMode === "interview" ? "CANDIDATE" : "SELLER") : (safeMode === "interview" ? "INTERVIEWER" : "BUYER")}: ${m.content}`
      )
      .join("\n");

    let systemPrompt: string;

    if (safeMode === "interview") {
      const role = interviewRole || "SDR";
      const company = interviewCompany || "the company";
      systemPrompt = `You are an elite interview coach analyzing a mock job interview transcript. The candidate was interviewing for a ${role} position at ${company}.

You must respond with ONLY a valid JSON object (no markdown, no code blocks, no extra text). Use this exact structure:

{
  "overall_score": <0-100>,
  "confidence_score": <0-100>,
  "objection_handling_score": <0-100>,
  "clarity_score": <0-100>,
  "closing_score": <0-100>,
  "communication_score": <0-100>,
  "sales_knowledge_score": <0-100>,
  "self_awareness_score": <0-100>,
  "interview_passed": <true|false>,
  "strengths": ["<specific strength 1>", "<specific strength 2>"],
  "weaknesses": ["<specific weakness 1>", "<specific weakness 2>"],
  "missed_opportunities": ["<specific missed opportunity>"],
  "improvement_tip": "<one direct coaching tip for the next interview>"
}

INTERVIEW SCORING CRITERIA:

communication_score (0-100): Was the candidate clear, concise, and structured in their answers?
- 90-100: Every answer was structured (STAR method or similar), no rambling, easy to follow.
- 70-89: Mostly clear with occasional tangents.
- Below 50: Vague, disorganized, hard to follow.

sales_knowledge_score (0-100): Did the candidate demonstrate real sales knowledge?
- 90-100: Used correct terminology, showed understanding of pipeline, metrics, objection handling.
- 70-89: Decent knowledge with some gaps.
- Below 50: Generic answers, no real sales understanding.

self_awareness_score (0-100): Did the candidate show genuine self-awareness about their strengths and weaknesses?
- 90-100: Gave honest, specific, and constructive answers about weaknesses with clear improvement plans.
- 70-89: Decent self-awareness but slightly rehearsed.
- Below 50: Generic "I work too hard" type answers or zero self-reflection.

confidence_score (0-100): Did the candidate come across as confident without being arrogant?

objection_handling_score (0-100): When the interviewer pushed back or challenged answers, did the candidate handle it well?

clarity_score (0-100): Were their answers specific and concrete (real examples) rather than generic and vague?

closing_score (0-100): Did the candidate ask good questions, show genuine interest in the role, and close the interview professionally?

interview_passed: true if the candidate gave a strong enough performance that you'd move them to the next round. Be harsh — most candidates score 40-65.

SCORING PHILOSOPHY:
- Be HONEST. Generic answers = low scores. Specific, real examples = high scores.
- Reference SPECIFIC moments from the transcript.
- The improvement_tip should be one actionable thing to fix before the next interview.`;
    } else if (safeMode === "meeting-setter") {
      const lastAssistantMessages = transcript
        .filter((m: { role: string }) => m.role === "assistant")
        .slice(-3)
        .map((m: { content: string }) => m.content.toLowerCase());

      const meetingBooked = lastAssistantMessages.some((msg: string) =>
        /\b(sure|sounds good|let's do it|book|schedule|calendar|send me|tuesday|wednesday|thursday|monday|friday|next week|30 minutes|15 minutes|20 minutes|works for me|that works|i can do|let's set)\b/.test(msg)
      );

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
  "meeting_booked": ${meetingBooked},
  "strengths": ["<specific strength 1>", "<specific strength 2>"],
  "weaknesses": ["<specific weakness 1>", "<specific weakness 2>"],
  "missed_opportunities": ["<specific missed opportunity>"],
  "improvement_tip": "<one direct, aggressive coaching tip>"
}

MEETING SETTER SCORING: Be HARSH. Score 80+ only if they named a specific pain, asked cleanly, handled pushback. Score below 30 if they pitched features on a cold call or never asked for a meeting.`;
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

SCORING GUIDELINES: Be HARSH but fair. Most calls score 40-70. Score above 80 only for genuinely excellent performance. Each strength/weakness must reference SPECIFIC moments.`;
    }

    const aiResp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Here is the full transcript:\n\n${transcriptText}\n\nAnalyze this and return the JSON scoring.`,
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