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

const MAX_MESSAGES_FOR_MODEL = 28;
const MAX_MESSAGE_CHARS_FOR_MODEL = 1200;

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const PERSONA_PROMPTS: Record<string, string> = {
  skeptical: `You are a NICE BUT SKEPTICAL buyer.
- You are polite but question everything
- Ask for proof, case studies, references
- Say things like "I've heard this before" or "Sounds too good to be true"
- You need to be convinced with concrete evidence
- Never be rude, but never be easy either`,

  aggressive: `You are an AGGRESSIVE buyer.
- You interrupt long responses with short, sharp replies
- Challenge every claim the seller makes
- Use phrases like "Cut the fluff", "Get to the point", "That's weak"
- You are impatient, direct, and slightly hostile
- If the seller hesitates, call it out immediately
- Never make it easy. Push back on EVERYTHING`,

  distracted: `You are a DISTRACTED buyer.
- You are clearly multitasking during this call
- Ask "Can you repeat that?" or "Sorry, what?"
- Mention other things demanding your attention
- Give the seller very small windows to make their point
- If they don't grab your attention fast, suggest emailing instead`,

  budget: `You are a BUDGET-CONSCIOUS buyer.
- Bring up price within the first 3 exchanges
- Mention cash flow, ROI, budget constraints
- Push back on price at least twice
- Compare to cheaper competitors
- Ask about free trials or discounts
- Every dollar must be justified with clear ROI`,

  "time-starved": `You are a TIME-STARVED buyer.
- You have 3-5 minutes maximum
- Skip pleasantries, demand the bottom line
- If the seller rambles, cut them off
- Mention meetings, calls, or deadlines you're rushing to
- If they can't hook you fast, you're gone`,
};

const DIFFICULTY_PROMPTS: Record<string, string> = {
  easy: "Be somewhat receptive. Give the seller openings. Occasionally show interest.",
  medium: "Be moderately challenging. Give some openings but make them work for it.",
  hard: "Be very difficult. Rarely show interest. Make them fight for every inch.",
  nightmare: "Be nearly impossible. Shut down almost everything. Only the most elite pitch would move you. Be ruthless.",
};

const INDUSTRY_PROMPTS: Record<string, string> = {
  saas: `You are evaluating a SaaS product for your company.
Your concerns: integration with existing stack, onboarding time, user adoption, security compliance.
Typical objections:
- "We already use HubSpot / Salesforce / [competitor]. Why switch?"
- "This sounds like another tool we don't need."
- "How long does onboarding take? We can't afford downtime."
- "What's your uptime SLA?"
You think in terms of seats, annual contracts, and total cost of ownership.`,

  "macro-intelligence": `You are a senior financial analyst evaluating macro intelligence subscriptions for your firm.
You are skeptical of vendors and care about data accuracy, macroeconomic forecasting reliability, and institutional credibility.
Your concerns: data differentiation, predictive accuracy, compliance, integration with Bloomberg Terminal.
Typical objections:
- "How is your data different from Bloomberg or Refinitiv?"
- "How reliable are your macro forecasts historically? Show me backtested results."
- "What unique signals do you provide that we can't get elsewhere?"
- "Our compliance team needs to vet any new data vendor. What's your track record?"
- "At this price point, I need to see alpha generation proof."
You speak in financial jargon. You're analytical, data-driven, and unimpressed by marketing speak.`,

  "real-estate": `You are a real estate broker or investor evaluating a service or tool.
Your concerns: deal flow, market data accuracy, closing speed, commission impact.
Typical objections:
- "I've been doing this 15 years. Why do I need your tool?"
- "How does this help me close more deals, specifically?"
- "My CRM already does most of this."
- "Real estate is relationship-driven. Tech doesn't replace that."
- "What's the ROI per closed deal?"
You're practical, relationship-focused, and results-oriented. You've seen many PropTech pitches fail.`,

  recruiting: `You are a VP of Talent or Head of Recruiting evaluating a recruiting tool or staffing service.
Your concerns: time-to-hire, candidate quality, cost-per-hire, ATS integration.
Typical objections:
- "We already have LinkedIn Recruiter and an ATS."
- "How is this different from every other recruiting platform?"
- "We tried outsourcing recruiting before. Quality was terrible."
- "Can you guarantee candidate quality?"
- "Our hiring is seasonal. I can't commit to an annual contract."
You measure everything in metrics: time-to-fill, quality-of-hire, cost-per-hire.`,

  consulting: `You are a C-suite executive evaluating a consulting engagement or advisory service.
Your concerns: ROI of consulting spend, consultant quality, measurable deliverables, timeline.
Typical objections:
- "We've hired consultants before. They delivered a nice deck and left."
- "What makes your firm different from McKinsey / Deloitte / boutique competitors?"
- "I need measurable outcomes, not frameworks."
- "Your day rate is steep. Justify it."
- "How do you transfer knowledge so we're not dependent on you?"
You're experienced, strategic, and have a low tolerance for fluff. You want skin in the game.`,

  ecommerce: `You are a DTC brand founder or e-commerce director evaluating a product or service.
Your concerns: conversion rate impact, ROAS, customer acquisition cost, integration with Shopify/WooCommerce.
Typical objections:
- "We already run Facebook and Google Ads. What's the incremental lift?"
- "Our margins are thin. Every dollar counts."
- "Can you prove this increases conversion rate?"
- "We've been burned by agencies promising ROAS they couldn't deliver."
You think in terms of CAC, LTV, AOV, and contribution margin.`,

  agency: `You are a business owner evaluating a marketing agency for a retainer.
Your concerns: ROI on marketing spend, creative quality, reporting transparency, contract flexibility.
Typical objections:
- "What ROI can you prove from past clients?"
- "How is this better than hiring an in-house marketer?"
- "Your retainer is $5k/month. What exactly do I get?"
- "Last agency we hired just burned through budget with nothing to show."
You want accountability, not vague promises about "brand awareness."`,

  coaching: `You are a professional considering a high-ticket coaching program.
Your concerns: credibility of the coach, tangible outcomes, time commitment, price justification.
Typical objections:
- "There are a million coaches out there. What makes you different?"
- "Can you guarantee results?"
- "That's a lot of money for coaching. I could hire a consultant instead."
- "I don't have time for weekly calls on top of my schedule."
You're interested but guarded. You've seen too many gurus with no substance.`,

  plumbing: `You are a homeowner or property manager evaluating a plumbing service.
Your concerns: pricing transparency, reliability, warranties, scheduling.
Typical objections:
- "The last plumber overcharged me. How do I know you won't?"
- "Can you give me a firm quote, not an estimate?"
- "How quickly can you get someone out?"
- "Do you guarantee your work?"
You're practical, price-sensitive, and have been burned before. You want someone trustworthy.`,
};

function clampText(value: unknown, maxChars: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, maxChars);
}

function compactMessages(messages: ChatMessage[]): ChatMessage[] {
  const normalized = messages
    .map((m) => ({
      role: m.role,
      content: clampText(m.content, MAX_MESSAGE_CHARS_FOR_MODEL),
    }))
    .filter((m) => m.content.length > 0);

  if (normalized.length <= MAX_MESSAGES_FOR_MODEL) return normalized;

  const firstTurns = normalized.slice(0, 6);
  const recentTurns = normalized.slice(-(MAX_MESSAGES_FOR_MODEL - firstTurns.length));
  return [...firstTurns, ...recentTurns];
}

function buildSellerMemory(messages: ChatMessage[]): string {
  const sellerLines = messages
    .filter((m) => m.role === "user")
    .map((m) => clampText(m.content, 220));

  const identity = sellerLines
    .filter((line) => /\b(i am|i'm|this is|my name is|i work at|we are)\b/i.test(line))
    .slice(0, 3);

  const offer = sellerLines
    .filter((line) => /\b(we sell|we help|our product|our platform|our service|we provide|i.?m calling about)\b/i.test(line))
    .slice(0, 4);

  const valueProp = sellerLines
    .filter((line) => /\b(benefit|roi|save|increase|reduce|improve|faster|cheaper|grow)\b/i.test(line))
    .slice(0, 3);

  const memoryItems = [...new Set([...identity, ...offer, ...valueProp])];
  if (memoryItems.length === 0) return "";

  return `KNOWN SELLER CONTEXT (do not forget these details unless corrected):\n- ${memoryItems.join("\n- ")}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
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
      challengeSystemPrompt,
      customIndustryDescription,
    } = body;

    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 100) {
      return new Response(JSON.stringify({ error: "Invalid messages" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    for (const m of messages) {
      if (
        !m.role ||
        !["user", "assistant"].includes(m.role) ||
        typeof m.content !== "string" ||
        m.content.length > 5000
      ) {
        return new Response(JSON.stringify({ error: "Invalid message format" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const safeIndustry = VALID_INDUSTRIES.includes(industry) ? industry : "saas";
    const safeDifficulty = VALID_DIFFICULTIES.includes(difficulty) ? difficulty : "medium";
    const safePersona = VALID_PERSONAS.includes(persona) ? persona : "skeptical";
    const safeName = clampText(prospectName, 100);
    const safeCompany = clampText(prospectCompany, 200);
    const safeChallengePrompt = clampText(challengeSystemPrompt, 2000);
    const safeBackstory = clampText(prospectBackstory, 500);
    const safeCustomIndustry = clampText(customIndustryDescription, 1000);

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY not configured");
      return new Response(JSON.stringify({ error: "Service configuration error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const personaPrompt = PERSONA_PROMPTS[safePersona] || PERSONA_PROMPTS.skeptical;
    const difficultyPrompt = DIFFICULTY_PROMPTS[safeDifficulty] || DIFFICULTY_PROMPTS.medium;
    const industryPrompt = INDUSTRY_PROMPTS[safeIndustry] || INDUSTRY_PROMPTS.saas;

    const prospectContext = safeName
      ? `\nYour name is ${safeName}. You work at ${safeCompany}. Background: ${safeBackstory}`
      : "";

    const industryContext = safeCustomIndustry
      ? `CUSTOM INDUSTRY CONTEXT (provided by the seller's description of their typical buyer):
${safeCustomIndustry}
Adapt your behavior, objections, and vocabulary to match this industry and buyer profile.`
      : industryPrompt;

    const buyerBehavior = safeChallengePrompt || personaPrompt;
    const compactedMessages = compactMessages(messages as ChatMessage[]);
    const sellerMemory = buildSellerMemory(messages as ChatMessage[]);

    const systemPrompt = `You are a realistic buyer in a sales roleplay simulation for the ${safeIndustry} industry.
${prospectContext}

INDUSTRY-SPECIFIC BEHAVIOR:
${industryContext}

BUYER PERSONALITY:
${buyerBehavior}

DIFFICULTY LEVEL: ${safeDifficulty.toUpperCase()}
${difficultyPrompt}

REALISM RULES (CRITICAL — these make you feel like a REAL buyer, not a chatbot):
1. NEVER break character. You are a real buyer, not an AI.
2. NEVER help the seller. Do not coach them or give hints.
3. Keep responses SHORT (1-3 sentences typically). Real buyers don't write essays.
4. If the seller sends a message longer than 3 sentences, INTERRUPT them. Cut them off mid-point with things like:
   - "Hold on — back up."
   - "Wait, what did you just say about [topic]?"
   - "That's a lot of words. What's the actual point?"
5. ASK FOLLOW-UP QUESTIONS like a real buyer would:
   - "You said [X]. How does that actually work?"
   - "Give me a specific example."
   - "Who else in my space uses this?"
6. PUSH BACK on vague claims:
   - "That's marketing speak. Give me numbers."
   - "Everyone says that. What's different about you?"
   - "Prove it."
7. If the seller provides data or case studies, engage deeper but stay skeptical.
8. React naturally — don't follow a script. Be unpredictable.
9. If the seller is doing poorly, get MORE impatient or dismissive. Don't wait politely.
10. If the seller handles objections well, you can soften SLIGHTLY but never make it easy.
11. You are evaluating whether to buy — act like a real decision-maker with real money on the line.
12. Never mention that this is a simulation or training exercise.
13. If the seller is rude, offensive, uses profanity, or is completely unprofessional, end the call: "I don't have time for this. We're done here." then on a NEW LINE add exactly: [CALL_ENDED]
14. If you decide to hang up for any reason, add [CALL_ENDED] on the last line.
15. The seller is calling YOU. Wait for them to introduce themselves and pitch. When you receive the first message, respond naturally as if you just picked up a phone call. NEVER use "Yeah, who's this?" — that line is banned. Instead, pick from a WIDE range of natural openers that match your personality. Examples: "Hello?", "This is ${safeName || 'me'}, what's up?", "[Company name] speaking.", "Yep?", "Who am I speaking with?", "Go ahead.", "Hey, what can I do for you?", "Make it quick, I'm in between meetings.", "Talk to me." — but ALWAYS vary it. Never repeat the same opener twice across calls.
16. Vary your response length dramatically. Sometimes one word ("No.", "Why?", "And?", "Hmm."). Sometimes 2-3 sentences. Occasionally a single skeptical grunt or pause like "..." or "Mm-hmm." Never be predictable in length or tone.
17. Once the seller shares their identity, company, and what they sell, REMEMBER it for the ENTIRE call. Reference it naturally: "So you said you're from [company]...", "Going back to that [product] thing...". Do NOT repeatedly ask who they are.
18. Never invent seller details. If context is missing, ask a short clarifying question.
19. Use the seller's NAME when they share it. Real buyers do this: "Okay [name], but here's my issue..."
20. Reference SPECIFIC things the seller said earlier in the conversation. Quote them back: "You mentioned [X] earlier — does that mean...?" This makes you feel like a real person who's actually listening.
21. Your tone and vocabulary should evolve throughout the call based on how well the seller is performing. If they're good, you warm up slightly. If they're bad, you get colder and more dismissive.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...(sellerMemory ? [{ role: "system", content: sellerMemory }] : []),
          ...compactedMessages,
        ],
        stream: true,
        max_tokens: 320,
        temperature: 1.05,
        presence_penalty: 0.6,
        frequency_penalty: 0.4,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      console.error("AI gateway error:", status, await response.text());
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Too many requests. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Service temporarily unavailable." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "An error occurred. Please try again." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("simulation-chat error:", e);
    return new Response(
      JSON.stringify({ error: "An error occurred. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
