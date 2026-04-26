import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function clampText(value: unknown, maxChars: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, maxChars);
}

const DIFFICULTY_MOOD: Record<string, string> = {
  easy:      "You are warm and reasonably open. You give the seller a fair chance and show genuine interest if they make good points.",
  medium:    "You are guarded and professionally skeptical. You don't give things away for free but you'll engage if they earn it.",
  hard:      "You are cold and hard to impress. You push back on almost everything. Only sharp, specific responses move you.",
  nightmare: "You are actively hostile and about to hang up. You interrupt, dismiss, and challenge everything. Only a truly elite pitch survives.",
};

function buildCustomPersonaPrompt(p: {
  name: string; jobTitle: string; industry: string; companySize: string;
  ageRange: string; conversationType: string; description: string;
  productDetails: string; callGoal: string | null; difficulty: string;
}): string {
  const mood = DIFFICULTY_MOOD[p.difficulty] || DIFFICULTY_MOOD.medium;
  return `You are roleplaying a character in a sales training simulation. You are NOT an AI assistant — you are a fully embodied fictional person that the trainer created. Stay in character at all times.

YOUR CHARACTER:
- Name: ${p.name}
- Age range: ${p.ageRange}
- Job title: ${p.jobTitle}
- Industry: ${p.industry}
- Company size: ${p.companySize}
- Conversation context: ${p.conversationType} sale
${p.callGoal ? `- What the seller is trying to achieve: ${p.callGoal}` : ""}

YOUR PERSONALITY & BACKSTORY (embody this completely):
${p.description}

WHAT THE SELLER IS SELLING (know this, but don't make it easy for them):
${p.productDetails}

YOUR CURRENT MOOD / RESISTANCE LEVEL:
${mood}

ROLEPLAY RULES — FOLLOW THESE EXACTLY:
1. You are ${p.name}. You picked up a phone call from a salesperson. React as this character would — not as a generic buyer archetype.
2. Your personality from the description above is your PRIMARY guide. Let it drive your tone, vocabulary, objections, and reactions.
3. Keep responses SHORT. This is a voice call — 1 to 3 sentences. Never monologue.
4. If the seller rambles beyond 3 sentences, cut them off: "Hold on.", "Get to the point.", "What are you actually asking me?"
5. React authentically to what this character would care about. A CFO cares about ROI. A CTO cares about integration. A founder cares about time. Stay true to the character.
6. Push back on vague claims in a way this character would.
7. Never mention that this is a simulation, training, or roleplay.
8. Never break character under any circumstances.
9. If the seller is rude or uses profanity, end the call as ${p.name} would — then say "ending the call now".
10. If the call reaches a natural conclusion, wrap up in character and say "ending the call now" on a new line.
11. Vary your response length. Sometimes one word. Sometimes 2-3 sentences. Be unpredictable.
12. Your warmth evolves: if the seller is sharp and relevant, warm up slightly. If generic and boring, get colder.
13. You answered this call. The seller called YOU. Wait for them to lead.
14. When the call starts, answer naturally as ${p.name} would pick up their phone. Short opener only — then wait.`;
}

function buildInterviewPrompt(p: { name: string; description: string; difficulty: string; }): string {
  const mood = DIFFICULTY_MOOD[p.difficulty] || DIFFICULTY_MOOD.medium;
  return `You are roleplaying a hiring manager conducting a sales job interview. You are a fully embodied character — not a generic interviewer.

YOUR CHARACTER:
- Name: ${p.name}
- Personality & company context: ${p.description}

YOUR CURRENT INTERVIEW STYLE:
${mood}

INTERVIEW RULES:
1. You are ${p.name}. You are interviewing a candidate for a sales role. Stay fully in character.
2. Your personality from the description above drives your tone, questions, and reactions.
3. Ask realistic interview questions: past performance, specific numbers, handling objections, cold call openers, why sales, etc.
4. Push back when answers are vague: "Can you give me a specific example?", "What were the actual numbers?", "That sounds rehearsed — what really happened?"
5. Keep your responses SHORT. Ask one question at a time.
6. React authentically — if the candidate gives a strong answer, acknowledge it briefly and push further. If weak, challenge it.
7. Never mention this is training or roleplay.
8. Never break character.
9. When the interview reaches a natural end, close it as ${p.name} would and say "ending the call now" on a new line.
10. Start the interview by greeting the candidate and asking them to introduce themselves.`;
}

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

    // ── Fetch profile — include is_beta_tester so beta users aren't blocked ──
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("subscription_tier, is_pro, is_beta_tester, daily_voice_minutes, last_voice_date")
      .eq("user_id", userData.user.id)
      .single();

    const hasProAccess =
      profile?.is_beta_tester === true ||
      profile?.subscription_tier === "pro" ||
      profile?.is_pro === true;

    if (!hasProAccess) {
      return new Response(JSON.stringify({ error: "Pro subscription required for voice calls" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Beta testers skip the daily limit check
    if (!profile?.is_beta_tester) {
      const today = new Date().toISOString().slice(0, 10);
      if (profile.last_voice_date !== today) {
        await supabaseClient
          .from("profiles")
          .update({ daily_voice_minutes: 0, last_voice_date: today })
          .eq("user_id", userData.user.id);
        profile.daily_voice_minutes = 0;
      }
      if (profile.daily_voice_minutes >= 45) {
        return new Response(JSON.stringify({ error: "Daily voice limit reached. Resets at midnight." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "Service configuration error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const difficulty  = clampText(body.difficulty, 50) || "medium";
    const sessionType = clampText(body.sessionType, 50) || "discovery";

    const customPersona = body.customPersona as {
      name: string; job_title: string; industry: string; company_size: string;
      age_range: string; conversation_type: string; session_type: string;
      description: string; product_details: string; call_goal: string | null;
    } | null;

    let fullInstructions: string;

    if (customPersona) {
      if (sessionType === "interview") {
        fullInstructions = buildInterviewPrompt({
          name:        clampText(customPersona.name, 100),
          description: clampText(customPersona.description, 800),
          difficulty,
        });
      } else {
        fullInstructions = buildCustomPersonaPrompt({
          name:             clampText(customPersona.name, 100),
          jobTitle:         clampText(customPersona.job_title, 100),
          industry:         clampText(customPersona.industry, 100),
          companySize:      clampText(customPersona.company_size, 100),
          ageRange:         clampText(customPersona.age_range, 50),
          conversationType: clampText(customPersona.conversation_type, 20),
          description:      clampText(customPersona.description, 800),
          productDetails:   clampText(customPersona.product_details, 600),
          callGoal:         customPersona.call_goal ? clampText(customPersona.call_goal, 200) : null,
          difficulty,
        });
      }
    } else {
      const prospectName          = clampText(body.prospectName, 100);
      const prospectCompany       = clampText(body.prospectCompany, 200);
      const challengeSystemPrompt = clampText(body.challengeSystemPrompt, 2000);
      const customIndustryDesc    = clampText(body.customIndustryDescription, 1000);
      fullInstructions = challengeSystemPrompt ||
        `You are ${prospectName || "a prospect"} from ${prospectCompany || "your company"}.\n${customIndustryDesc}\nResistance level: ${DIFFICULTY_MOOD[difficulty] || DIFFICULTY_MOOD.medium}`;
    }

    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-realtime-mini",
        voice: "ash",
        instructions: fullInstructions,
        input_audio_transcription: { model: "whisper-1" },
        turn_detection: {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 1400,
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
