import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import OpenAI from "npm:openai"

const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY"),
})

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  let text = ""

  try {
    const body = await req.json()
    text = body.text
  } catch {
    return new Response("Invalid JSON", { status: 400, headers: corsHeaders })
  }

  if (!text) {
    return new Response("Missing text", { status: 400, headers: corsHeaders })
  }

  const audio = await openai.audio.speech.create({
    model: "gpt-4o-mini-tts",
    voice: "alloy",
    input: text,
  })

  return new Response(await audio.arrayBuffer(), {
    headers: {
      ...corsHeaders,
      "Content-Type": "audio/mpeg",
    },
  })
})