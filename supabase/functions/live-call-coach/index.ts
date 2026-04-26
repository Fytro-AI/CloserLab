import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import OpenAI from "npm:openai";

const client = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") });

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

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
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("is_pro")
      .eq("user_id", userData.user.id)
      .single();

    if (!profile?.is_pro) {
      return new Response(JSON.stringify({ error: "Pro subscription required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { prospectSaid, sellerContext, companyProfile, callGoal, prospectInfo } = body;

    if (!prospectSaid || typeof prospectSaid !== "string" || prospectSaid.trim().length < 3) {
      return new Response(JSON.stringify({ error: "No speech" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const companyContext = companyProfile ? `
YOUR PRODUCT: ${companyProfile.what_you_sell}
IDEAL BUYER: ${companyProfile.who_you_sell_to}
PAIN POINTS YOU SOLVE: ${companyProfile.pain_points}
OBJECTIONS & HOW TO HANDLE:
${companyProfile.objections_and_responses}
${companyProfile.past_experience ? `SELLER BACKGROUND: ${companyProfile.past_experience}` : ""}` : "";

    const sellerCtx = Array.isArray(sellerContext) && sellerContext.length > 0
      ? `\nWHAT YOU SAID RECENTLY:\n${sellerContext.slice(-3).join("\n")}`
      : "";

    const systemPrompt = `You are a real-time sales co-pilot. The PROSPECT just said something. Write EXACTLY what the SELLER should say next — word for word, like a teleprompter.
${companyContext}
CALL GOAL: ${callGoal || "close the deal"}
PROSPECT: ${prospectInfo || "unknown"}${sellerCtx}

RULES:
- Write the exact spoken words. No meta-commentary, no coaching labels.
- 1-2 sentences MAX. Hard stop at 80 tokens.
- No filler openers: never start with "Great question", "Absolutely", "That's a great point".
- Be specific to what the prospect JUST said. Use company context.
- If it's an objection, use their known objection responses.
- Natural spoken language. Sound like a confident human closer.
- Output ONLY the script. Nothing else.`;

    const stream = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Prospect just said: "${prospectSaid.trim().slice(0, 500)}"` },
      ],
      temperature: 0.35,
      max_tokens: 80,
      stream: true,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const token = chunk.choices[0]?.delta?.content;
            if (token) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`));
            if (chunk.choices[0]?.finish_reason === "stop") {
              controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
            }
          }
        } catch {
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" },
    });

  } catch (e) {
    console.error("live-call-coach error:", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
