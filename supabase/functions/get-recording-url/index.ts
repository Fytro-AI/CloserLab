import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: userData, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;
    const { call_id, storage_path } = await req.json();

    if (!storage_path && !call_id) {
      return new Response(JSON.stringify({ error: "call_id or storage_path required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let path = storage_path;

    // If no direct path, look up from call_history
    if (!path && call_id) {
      // Check if user owns the call OR is a team owner with access
      const { data: callData } = await serviceClient
        .from("call_history")
        .select("recording_url, user_id, team_id")
        .eq("id", call_id)
        .single();

      if (!callData?.recording_url) {
        return new Response(JSON.stringify({ error: "No recording found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify access: own call OR team owner
      if (callData.user_id !== userId) {
        const { data: requesterProfile } = await serviceClient
          .from("profiles")
          .select("team_id, team_role")
          .eq("user_id", userId)
          .single();

        const isTeamOwner =
          requesterProfile?.team_role === "owner" &&
          requesterProfile?.team_id === callData.team_id;

        if (!isTeamOwner) {
          return new Response(JSON.stringify({ error: "Access denied" }), {
            status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      path = callData.recording_url;
    }

    // Generate fresh signed URL (1 hour)
    const { data: signedData, error: signedError } = await serviceClient.storage
      .from("call-recordings")
      .createSignedUrl(path, 60 * 60);

    if (signedError || !signedData?.signedUrl) {
      return new Response(JSON.stringify({ error: "Failed to generate playback URL" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ url: signedData.signedUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (e) {
    console.error("get-recording-url error:", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
