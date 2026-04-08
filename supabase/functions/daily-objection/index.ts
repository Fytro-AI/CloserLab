import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import OpenAI from "npm:openai";

// Initialize OpenAI client
const client = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") });

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const OBJECTION_SCENARIOS = [
  { context: "You're selling a SaaS CRM to a mid-market company. The buyer is the VP of Sales.", objection: "We already have a CRM and switching would cost us months of productivity. Why should we even consider this?" },
  { context: "You're pitching enterprise security software to a CISO.", objection: "Your product looks promising, but we've never heard of your company. How do I know you'll still be around in 2 years?" },
  { context: "You're selling marketing automation to a CMO at a D2C brand.", objection: "We tried a similar tool last year and it was a complete waste of money. What makes yours different?" },
  { context: "You're offering a recruiting platform to a Head of Talent.", objection: "Your pricing is 40% higher than your closest competitor. I can't justify that to my CFO." },
  { context: "You're selling cloud infrastructure to a CTO.", objection: "We're locked into a 3-year contract with our current provider. There's literally nothing you can do for us right now." },
  { context: "You're pitching an AI analytics tool to a VP of Product.", objection: "AI is just a buzzword. I've seen zero real ROI from any AI tool we've tried. Prove me wrong." },
  { context: "You're selling a project management tool to an engineering director.", objection: "My team hates new tools. Every time we introduce something, adoption drops to zero after a month." },
  { context: "You're pitching payment processing to an e-commerce founder.", objection: "We're doing fine with Stripe. Why would I add another vendor to manage?" },
  { context: "You're selling HR software to a People Operations lead.", objection: "This seems like it's built for big companies. We're only 50 people — isn't this overkill?" },
  { context: "You're offering a data warehouse solution to a Head of Data.", objection: "I need to talk to my team before making any decision. Can you just send me some materials?" },
  { context: "You're selling cybersecurity training to a compliance officer.", objection: "Our employees already do annual compliance training. Adding more will just annoy them." },
  { context: "You're pitching a customer support platform to a VP of CX.", objection: "We built our own ticketing system in-house. It's not great, but at least it's free." },
  { context: "You're selling supply chain software to a COO.", objection: "We've been burned by vendors who overpromise and underdeliver. What guarantees can you give me?" },
  { context: "You're pitching sales enablement to a RevOps manager.", objection: "Our reps are already overwhelmed with tools. The last thing they need is another login." },
  { context: "You're selling an employee wellness platform to an HR director.", objection: "Nice to have, but in this economy we're cutting costs, not adding them." },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Authentication failed" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = userData.user;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const body = await req.json();
    const { action } = body;

    // ------------------------- GET today's objections -------------------------
    if (action === "get") {
      const today = new Date().toISOString().split("T")[0];
      const { data: todayObjections } = await supabase
        .from("daily_objections")
        .select("*")
        .eq("user_id", user.id)
        .eq("objection_date", today)
        .order("created_at", { ascending: true });

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_pro")
        .eq("user_id", user.id)
        .single();

      const isPro = profile?.is_pro ?? false;
      const limit = isPro ? 5 : 1;
      const used = todayObjections?.length ?? 0;

      return new Response(JSON.stringify({
        objections: todayObjections ?? [],
        used,
        limit,
        is_pro: isPro,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ------------------------- GENERATE new objection -------------------------
    if (action === "generate") {
      const today = new Date().toISOString().split("T")[0];
      const { data: todayObjections } = await supabase
        .from("daily_objections")
        .select("id")
        .eq("user_id", user.id)
        .eq("objection_date", today);

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_pro")
        .eq("user_id", user.id)
        .single();

      const isPro = profile?.is_pro ?? false;
      const limit = isPro ? 5 : 1;
      const used = todayObjections?.length ?? 0;

      if (used >= limit) {
        return new Response(JSON.stringify({ error: "Daily limit reached", used, limit }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const scenario = OBJECTION_SCENARIOS[Math.floor(Math.random() * OBJECTION_SCENARIOS.length)];

      const { data: inserted, error: insertError } = await supabase
        .from("daily_objections")
        .insert({
          user_id: user.id,
          objection_text: scenario.objection,
          buyer_context: scenario.context,
        })
        .select("*")
        .single();

      if (insertError) {
        console.error("Insert error:", insertError);
        return new Response(JSON.stringify({ error: "Failed to create objection" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ objection: inserted, used: used + 1, limit }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ------------------------- RESPOND to an objection -------------------------
    if (action === "respond") {
      const { objection_id, response: userResponse } = body;
      if (!objection_id || !userResponse || typeof userResponse !== "string" || userResponse.trim().length < 5) {
        return new Response(JSON.stringify({ error: "Invalid response" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: objection } = await supabase
        .from("daily_objections")
        .select("*")
        .eq("id", objection_id)
        .eq("user_id", user.id)
        .single();

      if (!objection) {
        return new Response(JSON.stringify({ error: "Objection not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (objection.user_response) {
        return new Response(JSON.stringify({ error: "Already responded" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ------------------------- AI scoring using OpenAI -------------------------
      let score = 50;
      let feedback = "Unable to generate feedback. Try again later.";

      try {
        const completion = await client.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `You are a world-class sales coach. A salesperson is practicing objection handling.
Score from 1-100 based on:
- Did they acknowledge the buyer's concern?
- Did they reframe or pivot effectively?
- Was the tone professional and empathetic?
- Did they move toward next steps?
Respond ONLY in valid JSON: {"score": <number>, "feedback": "<2-3 sentences>"}`
            },
            {
              role: "user",
              content: `Context: ${objection.buyer_context}\nObjection: "${objection.objection_text}"\nResponse: "${userResponse.trim().slice(0, 2000)}"`
            }
          ],
          temperature: 0.3,
          max_tokens: 300
        });

        const content = completion.choices?.[0]?.message?.content ?? "";
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          score = Math.max(1, Math.min(100, Number(parsed.score) || 50));
          feedback = parsed.feedback || feedback;
        }
      } catch (e) {
        console.error("AI scoring error:", e);
      }

      await supabase
        .from("daily_objections")
        .update({
          user_response: userResponse.trim().slice(0, 2000),
          ai_feedback: feedback,
          score,
        })
        .eq("id", objection_id);

      return new Response(JSON.stringify({ score, feedback }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("daily-objection error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});