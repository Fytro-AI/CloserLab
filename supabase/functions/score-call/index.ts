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
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    for (const m of transcript) {
      if (!m.role || !["user", "assistant"].includes(m.role) || typeof m.content !== "string" || m.content.length > 5000) {
        return new Response(JSON.stringify({ error: "Invalid transcript format" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sellerLabel = safeMode === "interview" ? "CANDIDATE" : "SELLER";
    const buyerLabel = safeMode === "interview" ? "INTERVIEWER" : "BUYER";

    const transcriptText = transcript
      .map((m: { role: string; content: string }) =>
        `${m.role === "user" ? sellerLabel : buyerLabel}: ${m.content}`
      )
      .join("\n");

    let systemPrompt: string;

    if (safeMode === "interview") {
      const role = interviewRole || "SDR";
      const company = interviewCompany || "the company";

      systemPrompt = `You are an elite interview coach analyzing a mock job interview. The candidate interviewed for a ${role} position at ${company}.

Return ONLY a valid JSON object. No markdown, no code blocks, no extra text.

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
  "call_summary": "<3-5 sentence paragraph describing the interview context, what stage it reached, and the overall flow. Reference specific moments from the transcript.>",
  "customer_response": "<2-3 sentences describing how the INTERVIEWER responded throughout — were they engaged, skeptical, impressed, frustrated? Quote or reference specific things they said.>",
  "overall_impression": "<3-4 sentence final verdict paragraph. Was this a pass or fail and specifically why? What was the single thing that hurt or helped most? Be direct and honest.>",
  "strengths": [
    "<specific strength referencing an exact moment in the transcript>",
    "<specific strength referencing an exact moment in the transcript>"
  ],
  "weaknesses": [
    "<specific weakness with exact quote or moment from transcript>",
    "<specific weakness with exact quote or moment from transcript>"
  ],
  "missed_opportunities": [
    "<specific missed opportunity — what could have been said and when>"
  ],
  "improvement_tip": "<one direct, specific, actionable coaching instruction for the next interview. Reference what they did wrong and exactly what to do instead.>"
}

SCORING:
- communication_score: Structure, clarity, conciseness. 90+ = STAR method, zero rambling. Below 50 = vague and disorganized.
- sales_knowledge_score: Real sales terminology, metrics, process knowledge. Below 50 = generic answers with no substance.
- self_awareness_score: Genuine, honest answers about weaknesses with real improvement plans. Below 50 = clichés like "I work too hard".
- confidence_score: Came across assured without being arrogant.
- objection_handling_score: When the interviewer pushed back, did they handle it well or fold?
- clarity_score: Were answers specific (real examples) or vague and generic?
- closing_score: Did they ask good questions, show real interest, close professionally?
- interview_passed: true only if genuinely strong enough for the next round. Be harsh — most candidates score 40-65.

The call_summary, customer_response, and overall_impression fields MUST be full prose paragraphs. They must reference specific things said in the transcript. No bullet points. No generic filler.`;

    } else if (safeMode === "meeting-setter") {
      const lastAssistantMessages = transcript
        .filter((m: { role: string }) => m.role === "assistant")
        .slice(-3)
        .map((m: { content: string }) => m.content.toLowerCase());

      const meetingBooked = lastAssistantMessages.some((msg: string) =>
        /\b(sure|sounds good|let's do it|book|schedule|calendar|send me|tuesday|wednesday|thursday|monday|friday|next week|30 minutes|15 minutes|20 minutes|works for me|that works|i can do|let's set)\b/.test(msg)
      );

      systemPrompt = `You are an elite cold call coach analyzing a meeting-setter call. The seller's only goal was to book a follow-up meeting from a cold call.

Return ONLY a valid JSON object. No markdown, no code blocks, no extra text.

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
  "call_summary": "<3-5 sentence paragraph. How did the call open? What value proposition did the seller use? What objections came up? How did it end? Reference specific transcript moments.>",
  "customer_response": "<2-3 sentences describing how the PROSPECT responded — were they hostile, curious, polite but dismissive? Quote or closely reference specific things they actually said.>",
  "overall_impression": "<3-4 sentence verdict. Was the meeting booked or not and exactly why? What was the decisive moment? Be direct.>",
  "strengths": [
    "<specific strength with exact moment from transcript>",
    "<specific strength with exact moment from transcript>"
  ],
  "weaknesses": [
    "<specific weakness with exact quote or moment>",
    "<specific weakness with exact quote or moment>"
  ],
  "missed_opportunities": [
    "<exact moment where a different response would have changed the outcome>"
  ],
  "improvement_tip": "<one direct actionable instruction. Quote what they said, then give the exact words they should have said instead.>"
}

Be HARSH. Score 80+ only if they named a specific pain, asked cleanly, handled every pushback. Score below 30 if they pitched features or never asked for the meeting. The call_summary, customer_response, and overall_impression MUST be full prose paragraphs referencing real transcript moments.`;

    } else {
      // Discovery call
      systemPrompt = `You are an elite sales coach analyzing a discovery call practice session. The seller practiced against a ${safePersona} buyer in the ${safeIndustry} industry at ${safeDifficulty} difficulty.

Return ONLY a valid JSON object. No markdown, no code blocks, no extra text.

{
  "overall_score": <0-100>,
  "confidence_score": <0-100>,
  "objection_handling_score": <0-100>,
  "clarity_score": <0-100>,
  "closing_score": <0-100>,
  "call_summary": "<3-5 sentence paragraph. Describe the call context, how the conversation flowed, what the seller was selling, what objections came up, and how the call ended. Reference specific moments from the transcript.>",
  "customer_response": "<2-3 sentences describing how the BUYER responded throughout the call — were they resistant, gradually warmed up, stayed cold, asked questions? Quote or closely reference specific things they actually said from the transcript.>",
  "overall_impression": "<3-4 sentence final verdict. Was this call a success or failure and specifically why? What was the single moment that defined the outcome? Be blunt.>",
  "strengths": [
    "<specific strength. Quote or reference the exact moment in the transcript where this showed up.>",
    "<specific strength. Quote or reference the exact moment in the transcript where this showed up.>"
  ],
  "weaknesses": [
    "<specific weakness. Quote the exact words or moment that illustrates this. Be specific, not generic.>",
    "<specific weakness. Quote the exact words or moment that illustrates this. Be specific, not generic.>"
  ],
  "missed_opportunities": [
    "<a specific moment in the transcript where a different response would have changed the direction of the call. Quote what was said and what should have been said instead.>"
  ],
  "improvement_tip": "<one direct, aggressive coaching instruction. Quote what they actually said, then give the exact words or approach they should use next time. No vague advice.>"
}

SCORING:
- Be HARSH but fair. Most calls score 40-70. Score 80+ only for genuinely excellent performance.
- objection_handling_score: Did they acknowledge, reframe, and advance past objections, or did they fold, repeat themselves, or go defensive?
- confidence_score: Did they sound certain and in control, or hesitant and apologetic?
- clarity_score: Was their pitch/value proposition specific and concrete, or vague and full of buzzwords?
- closing_score: Did they attempt to move the conversation forward with a clear next step?

CRITICAL: The call_summary, customer_response, and overall_impression MUST be full prose paragraphs. They MUST reference specific things actually said in the transcript. Generic, vague analysis is not acceptable. If the seller said something specific, quote it or closely paraphrase it.`;
    }

    const aiResp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `TRANSCRIPT:\n\n${transcriptText}\n\nAnalyze and return the JSON.`,
        },
      ],
      temperature: 0.25,
      max_tokens: 1800,
    });

    const content = aiResp.choices?.[0]?.message?.content ?? "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      console.error("AI response could not be parsed:", content);
      return new Response(JSON.stringify({ error: "Failed to parse AI scoring" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const scores = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify(scores), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("score-call error:", e);
    return new Response(JSON.stringify({ error: "An internal error occurred. Please try again." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});