import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader! } } }
  );

  const { data: userData } = await supabaseClient.auth.getUser();
  if (!userData.user) return new Response("Unauthorized", { status: 401 });

  const { minutesUsed } = await req.json();

  await supabaseClient.rpc("increment_voice_minutes", {
    user_id_input: userData.user.id,
    minutes_input: Math.min(minutesUsed, 180), // cap at 180 just in case
  });

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});