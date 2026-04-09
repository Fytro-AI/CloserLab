import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
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

    // Use service-role for writes so RLS doesn't block us
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // ── Validate caller is owner/admin of this team ───────────────────────────
    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("team_id, team_role, name")
      .eq("user_id", userData.user.id)
      .single();

    if (
      !callerProfile?.team_id ||
      !["owner", "administrator"].includes(callerProfile.team_role)
    ) {
      return new Response(JSON.stringify({ error: "Only team owners/admins can invite members" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Parse body ────────────────────────────────────────────────────────────
    const { email } = await req.json();
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return new Response(JSON.stringify({ error: "Valid email required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const safeEmail = email.trim().toLowerCase().slice(0, 254);

    // ── Fetch team details ────────────────────────────────────────────────────
    const { data: team } = await supabaseAdmin
      .from("teams")
      .select("name")
      .eq("id", callerProfile.team_id)
      .single();

    // ── Check for an existing pending invite ──────────────────────────────────
    const { data: existing } = await supabaseAdmin
      .from("team_invites")
      .select("id, token, expires_at")
      .eq("team_id", callerProfile.team_id)
      .eq("email", safeEmail)
      .eq("status", "pending")
      .maybeSingle();

    let token: string;

    if (existing && new Date(existing.expires_at) > new Date()) {
      // Re-use the existing invite token
      token = existing.token;
    } else {
      // Expire any old ones and create a fresh invite
      if (existing) {
        await supabaseAdmin
          .from("team_invites")
          .update({ status: "expired" })
          .eq("id", existing.id);
      }

      const { data: inserted, error: insertError } = await supabaseAdmin
        .from("team_invites")
        .insert({
          team_id: callerProfile.team_id,
          invited_by: userData.user.id,
          email: safeEmail,
        })
        .select("token")
        .single();

      if (insertError || !inserted) {
        console.error("Insert error:", insertError);
        return new Response(JSON.stringify({ error: "Failed to create invite" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      token = inserted.token;
    }

    // ── Build invite link ─────────────────────────────────────────────────────
    const origin = req.headers.get("origin") || "https://closerlab.net";
    const inviteLink = `${origin}/invite-auth/${token}`;

    // ── Send email via Resend ─────────────────────────────────────────────────
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not configured");
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const teamName  = team?.name ?? "your team";
    const senderName = callerProfile.name ?? "Your team manager";

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Inter',Arial,sans-serif;color:#f2f2f2;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:520px;background:#111;border-radius:16px;border:1px solid #1e1e1e;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="padding:32px 36px 24px;border-bottom:1px solid #1e1e1e;">
              <p style="margin:0 0 16px;font-size:11px;font-weight:800;letter-spacing:0.15em;text-transform:uppercase;color:#84cc16;">CloserLab</p>
              <h1 style="margin:0;font-size:24px;font-weight:900;color:#f2f2f2;line-height:1.2;">
                You've been invited to join<br /><span style="color:#84cc16;">${teamName}</span>
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:28px 36px;">
              <p style="margin:0 0 20px;font-size:15px;color:#a3a3a3;line-height:1.6;">
                <strong style="color:#f2f2f2;">${senderName}</strong> has invited you to train together on CloserLab — the AI sales dojo where reps practice tough calls, get scored, and level up.
              </p>

              <!-- CTA button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 24px;">
                    <a href="${inviteLink}"
                       style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#84cc16,#65a30d);border-radius:10px;color:#0a0a0a;font-size:15px;font-weight:900;text-decoration:none;letter-spacing:0.03em;">
                      Accept Invitation →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;font-size:12px;color:#555;line-height:1.5;">
                Or copy this link into your browser:
              </p>
              <p style="margin:0 0 24px;padding:10px 14px;background:#1a1a1a;border-radius:8px;border:1px solid #2a2a2a;font-size:12px;color:#84cc16;word-break:break-all;">
                ${inviteLink}
              </p>

              <p style="margin:0;font-size:12px;color:#3a3a3a;line-height:1.5;">
                This invitation expires in 7 days. If you didn't expect this email, you can safely ignore it.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 36px;border-top:1px solid #1e1e1e;">
              <p style="margin:0;font-size:11px;color:#3a3a3a;">
                © ${new Date().getFullYear()} CloserLab · <a href="https://closerlab.net" style="color:#3a3a3a;text-decoration:none;">closerlab.net</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const resendResp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "CloserLab <noreply@closerlab.net>",
        to:   [safeEmail],
        subject: `${senderName} invited you to join ${teamName} on CloserLab`,
        html: emailHtml,
      }),
    });

    if (!resendResp.ok) {
      const errText = await resendResp.text();
      console.error("Resend error:", resendResp.status, errText);
      return new Response(JSON.stringify({ error: "Failed to send email" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, token }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (e) {
    console.error("send-team-invite error:", e);
    return new Response(JSON.stringify({ error: "An internal error occurred" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});