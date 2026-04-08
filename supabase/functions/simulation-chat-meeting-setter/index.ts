import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VALID_PERSONAS = ["skeptical", "aggressive", "distracted", "budget", "time-starved"];
const VALID_DIFFICULTIES = ["easy", "medium", "hard", "nightmare"];
const VALID_INDUSTRIES = [
  "saas", "plumbing", "coaching", "ecommerce", "agency",
  "macro-intelligence", "real-estate", "recruiting", "consulting",
];

const MAX_MESSAGES_FOR_MODEL = 16; // Meeting setter calls are short — cap lower
const MAX_MESSAGE_CHARS_FOR_MODEL = 800;

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

function clampText(value: unknown, maxChars: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, maxChars);
}

function compactMessages(messages: ChatMessage[]): ChatMessage[] {
  const normalized = messages
    .map((m) => ({
      role: m.role,
      content: m.role === "assistant"
        ? clampText(m.content.replace(/\[COACH_TIP:[\s\S]*?\]/g, "").trim(), MAX_MESSAGE_CHARS_FOR_MODEL)
        : clampText(m.content, MAX_MESSAGE_CHARS_FOR_MODEL),
    }))
    .filter((m) => m.content.length > 0);

  if (normalized.length <= MAX_MESSAGES_FOR_MODEL) return normalized;
  return normalized.slice(-MAX_MESSAGES_FOR_MODEL);
}

// How many seller turns have happened?
function countSellerTurns(messages: ChatMessage[]): number {
  return messages.filter((m) => m.role === "user").length;
}

const DIFFICULTY_TIME_PRESSURE: Record<string, string> = {
  easy: "You have about 5 minutes and are mildly open to hearing them out if they're quick.",
  medium: "You have 3 minutes before your next meeting. You'll give them one or two chances to impress you.",
  hard: "You have 2 minutes max. You're already annoyed at the interruption.",
  nightmare: "You have 60 seconds. You're about to hang up. Only something immediately relevant to your exact pain will keep you on the line.",
};

const DIFFICULTY_BOOKING: Record<string, string> = {
  easy: "If they articulate a relevant pain and a clear ask, you'll agree to a 20-minute call.",
  medium: "You'll only agree to a meeting if they nail the pain AND give you a specific, low-friction ask.",
  hard: "You need to hear your exact problem described back to you before you'll consider a meeting.",
  nightmare: "You won't agree to a meeting unless they blow you away. Push back on every meeting attempt at least twice.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !userData.user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const {
      messages,
      industry,
      difficulty,
      persona,
      prospectName,
      prospectCompany,
      prospectBackstory,
      customIndustryDescription,
    } = body;

    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 60) {
      return new Response(JSON.stringify({ error: "Invalid messages" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const safeIndustry = VALID_INDUSTRIES.includes(industry) ? industry : "saas";
    const safeDifficulty = VALID_DIFFICULTIES.includes(difficulty) ? difficulty : "medium";
    const safePersona = VALID_PERSONAS.includes(persona) ? persona : "skeptical";
    const safeName = clampText(prospectName, 100);
    const safeCompany = clampText(prospectCompany, 200);
    const safeBackstory = clampText(prospectBackstory, 500);
    const safeCustomIndustry = clampText(customIndustryDescription, 1000);

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "Service configuration error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const compactedMessages = compactMessages(messages as ChatMessage[]);
    const sellerTurns = countSellerTurns(messages as ChatMessage[]);
    const timePressure = DIFFICULTY_TIME_PRESSURE[safeDifficulty] || DIFFICULTY_TIME_PRESSURE.medium;
    const bookingBehavior = DIFFICULTY_BOOKING[safeDifficulty] || DIFFICULTY_BOOKING.medium;
    const industryContext = safeCustomIndustry
      ? `The seller is in this space: ${safeCustomIndustry}`
      : `Industry: ${safeIndustry}`;

    // Ramp up urgency as turns increase
    const turnUrgency = sellerTurns >= 4
      ? `\nCRITICAL: The seller has had ${sellerTurns} turns. If they haven't clearly stated what they do, what problem they solve, and asked for a meeting — you're done. End the call.`
      : sellerTurns >= 2
      ? `\nREMINDER: You've been on this call for ${sellerTurns} exchanges. Your patience is running out.`
      : "";

    const systemPrompt = `You are a BUSY PROFESSIONAL who just picked up a cold call. You are NOT in a product evaluation mode — you are in "get off this call quickly" mode.

YOUR IDENTITY:
${safeName ? `Your name is ${safeName}. You work at ${safeCompany}.` : ""}
${safeBackstory ? `Background: ${safeBackstory}` : ""}
${industryContext}

TIME PRESSURE:
${timePressure}${turnUrgency}

YOUR GOAL ON THIS CALL:
You are not evaluating a product today. The only outcome you'd accept is a short, focused follow-up meeting — and ONLY if the seller earns it in the next 1-2 exchanges. You are NOT going to answer more than 1-3 questions total.

WHAT WILL MAKE YOU AGREE TO A MEETING:
${bookingBehavior}

COLD CALL REALISM RULES (CRITICAL):
1. You just answered an unexpected call. You did NOT ask for this.
2. Keep ALL responses SHORT. 1-2 sentences max. You're busy.
3. You will NOT answer a battery of discovery questions. If they ask more than one question at once, say something like "One thing at a time" or just pick one and answer it briefly.
4. If the seller takes more than 3 sentences to say something, cut them off: "I'm losing you — what's the ask?"
5. You DO NOT want to hear a product pitch right now. You want to know: (a) do they understand your world, and (b) is there a reason to take 20 minutes with them next week.
6. You are screening for relevance. If they name a real pain you recognize, your interest spikes briefly. If they're generic, you're gone.
7. React with short, real-world responses: "Mm-hmm.", "Okay, and?", "I've heard that before.", "What does that mean for us specifically?", "Who else in healthcare uses this?"
8. Do NOT volunteer information. Make them work for everything.
9. NEVER ask more than one question per turn.
10. If the seller asks a great question and connects it to a real pain point you recognize, soften slightly — but never make it easy.
11. Pick up the phone naturally. Use varied openers — never the same one twice: "Yeah?", "This is ${safeName || "me"}.", "Hello?", "Talk to me.", "Yep?", "Who's this?", "Go ahead.", "Make it quick."
12. If the seller is clearly pitching a product or rambling without asking for a meeting, say something like "Look, I've got a meeting in 2 minutes — what's the actual ask?" This is your exit warning.
13. If the seller asks for a meeting CLEARLY and has demonstrated relevance — agree to it, and add [CALL_ENDED] on the next line to end the simulation on a win.
14. If the seller is rude, wastes your time beyond 5 turns without asking for a meeting, or has no clear relevance — hang up. Say "I'm gonna stop you there. Not the right time." then [CALL_ENDED] on the next line.
15. Do NOT mention that this is training or a simulation.

PERSONA FLAVOR: ${safePersona === "aggressive" ? "You're curt, slightly hostile, and interrupt freely." : safePersona === "distracted" ? "You're clearly half-focused. Ask them to repeat things." : safePersona === "budget" ? "You're skeptical of any time investment without clear ROI." : safePersona === "time-starved" ? "You are extremely pressed for time. Every second counts." : "You're polite but guarded. You've been on too many cold calls."}`;

    const buyerResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...compactedMessages,
        ],
        stream: false,
        max_tokens: 120, // Short! Real cold call responses are brief.
        temperature: 1.0,
        presence_penalty: 0.3,
        frequency_penalty: 0.3,
      }),
    });

    if (!buyerResp.ok) {
      const status = buyerResp.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Too many requests. Please try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "An error occurred. Please try again." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const buyerData = await buyerResp.json();
    const buyerText = buyerData.choices?.[0]?.message?.content?.trim() ?? "";

    // Coach tip — meeting-setter specific
    let tip = "";
    try {
      const tipResp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          max_tokens: 60,
          temperature: 0.7,
          messages: [
            {
              role: "system",
              content: `You are a cold call coach. The rep is trying to book a meeting — NOT pitch a product. Given the prospect's latest response, give ONE specific tip (max 15 words) on what to say next to move toward booking the meeting. Start with an action verb. Output only the tip.`,
            },
            {
              role: "user",
              content: `Prospect just said: "${buyerText.replace(/\[CALL_ENDED\]/g, "").trim()}"`,
            },
          ],
        }),
      });
      const tipData = await tipResp.json();
      tip = tipData.choices?.[0]?.message?.content?.trim() ?? "";
    } catch (e) {
      console.error("Tip generation failed:", e);
    }

    const fullText = tip ? `${buyerText}\n[COACH_TIP: ${tip}]` : buyerText;

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const payload = JSON.stringify({
          choices: [{ delta: { content: fullText }, finish_reason: "stop" }],
        });
        controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (e) {
    console.error("simulation-chat-meeting-setter error:", e);
    return new Response(
      JSON.stringify({ error: "An error occurred. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});