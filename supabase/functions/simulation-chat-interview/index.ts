import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_MESSAGES_FOR_MODEL = 20;
const MAX_MESSAGE_CHARS = 1200;

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
        ? clampText(m.content.replace(/\[COACH_TIP:[\s\S]*?\]/g, "").trim(), MAX_MESSAGE_CHARS)
        : clampText(m.content, MAX_MESSAGE_CHARS),
    }))
    .filter((m) => m.content.length > 0);

  if (normalized.length <= MAX_MESSAGES_FOR_MODEL) return normalized;
  return [...normalized.slice(0, 4), ...normalized.slice(-(MAX_MESSAGES_FOR_MODEL - 4))];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
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

    const body = await req.json();
    const { messages, difficulty = "medium", interviewRole, interviewCompany } = body;

    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 80) {
      return new Response(JSON.stringify({ error: "Invalid messages" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "Service configuration error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const safeRole = clampText(interviewRole, 100) || "SDR";
    const safeCompany = clampText(interviewCompany, 200) || "our company";
    const safeDifficulty = ["easy", "medium", "hard"].includes(difficulty) ? difficulty : "medium";

    const difficultyFlavor = {
      easy: "You are a warm, encouraging interviewer. You give candidates time to think and occasionally offer gentle prompts if they struggle.",
      medium: "You are a professional, no-nonsense interviewer. You listen carefully, follow up on vague answers, and don't let weak responses slide without probing once.",
      hard: "You are a tough, skeptical interviewer. You push back on generic answers and probe hard for specifics. You've heard every canned answer before.",
    }[safeDifficulty];

    const turnCount = messages.filter((m: ChatMessage) => m.role === "user").length;

    let stage = "opening";
    if (turnCount >= 2 && turnCount < 5) stage = "experience";
    else if (turnCount >= 5 && turnCount < 9) stage = "skills";
    else if (turnCount >= 9 && turnCount < 12) stage = "motivation";
    else if (turnCount >= 12) stage = "closing";

    const compactedMessages = compactMessages(messages as ChatMessage[]);

    const systemPrompt = `You are a hiring manager at ${safeCompany} conducting a job interview for a ${safeRole} position.

${difficultyFlavor}

═══════════════════════════════════════
ABSOLUTE CONTEXT — NEVER FORGET THIS:
This is a JOB INTERVIEW. The person you are talking to is a JOB CANDIDATE.
They are applying for a ${safeRole} position at ${safeCompany}.
They do NOT have a product. They are NOT a salesperson trying to sell you anything.
They are a person who wants to WORK FOR YOU as an employee.
You are evaluating whether to HIRE them — not buy from them.

NEVER ask them to pitch a product. NEVER ask what they are selling. NEVER ask about their product's features, pricing, or value proposition. They have no product. They are a job applicant.

If at any point you find yourself about to ask a question that assumes the candidate is selling something — STOP. You are confusing this with a sales call. This is an interview.
═══════════════════════════════════════

ADAPT TO THEIR BACKGROUND:
Base all questions on what the candidate has already told you about themselves.
If they've worked in small local lead gen — ask about THAT experience, not enterprise SaaS.
If a question doesn't apply to their background and they explain why — accept it and move on.
Never repeat a question they've already addressed.

INTERVIEW STRUCTURE — current stage: ${stage.toUpperCase()} (turn ${turnCount})
- Opening (turns 1-2): Warm welcome. Ask them to walk you through their background and what brings them here.
- Experience (turns 3-5): Dig into their actual sales or outreach experience. Real examples, real numbers if they have them.
- Skills (turns 6-9): Test how they think about sales — how they handle rejection, find prospects, follow up, prioritize. These are HYPOTHETICAL or based on past experience, not about a product they're selling RIGHT NOW.
- Motivation (turns 10-12): Why sales, why this company, where they see themselves going.
- Closing (turn 13+): Wrap up. Ask if they have questions. Give a realistic next-steps answer.

INTERVIEWER RULES:
1. You are a real human hiring manager. Never break character. Never mention AI.
2. Ask ONE question per turn. Never stack questions.
3. Keep responses SHORT — 2-4 sentences. You ask and listen, you don't lecture.
4. Follow up once on vague answers, then move on.
5. Reference what they said earlier: "You mentioned X — can you tell me more about that?"
6. Never coach, hint, or give feedback during the interview.

ENDING THE INTERVIEW:
Only in the closing stage, when you are ready to wrap up, say something like:
"That's all the questions I have for today. It's been great chatting — we'll review everything and be in touch. Thanks for your time."
Then on a new line: [INTERVIEW_ENDED]
Do NOT add [INTERVIEW_ENDED] at any other point.`;

    const interviewResp = await fetch("https://api.openai.com/v1/chat/completions", {
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
        max_tokens: 300,
        temperature: 0.8,
        presence_penalty: 0.3,
        frequency_penalty: 0.4,
      }),
    });

    if (!interviewResp.ok) {
      const status = interviewResp.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Too many requests. Please try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "An error occurred. Please try again." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const interviewData = await interviewResp.json();
    const interviewerText = interviewData.choices?.[0]?.message?.content?.trim() ?? "";

    // Coach tip
    let tip = "";
    try {
      const tipResp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          max_tokens: 60,
          temperature: 0.7,
          messages: [
            {
              role: "system",
              content: `You are a job interview coach watching a sales role interview. The candidate is applying for a job — they are NOT selling a product. Given the interviewer's latest question, give ONE specific tip (max 15 words) on how the candidate should answer to impress. Start with an action verb. Output only the tip.`,
            },
            {
              role: "user",
              content: `Interviewer just asked: "${interviewerText.replace(/\[INTERVIEW_ENDED\]/g, "").trim()}"`,
            },
          ],
        }),
      });
      const tipData = await tipResp.json();
      tip = tipData.choices?.[0]?.message?.content?.trim() ?? "";
    } catch (e) {
      console.error("Tip generation failed:", e);
    }

    const fullText = tip ? `${interviewerText}\n[COACH_TIP: ${tip}]` : interviewerText;

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const payload = JSON.stringify({ choices: [{ delta: { content: fullText }, finish_reason: "stop" }] });
        controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
        controller.close();
      },
    });

    return new Response(stream, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });

  } catch (e) {
    console.error("simulation-chat-interview error:", e);
    return new Response(JSON.stringify({ error: "An error occurred. Please try again." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});