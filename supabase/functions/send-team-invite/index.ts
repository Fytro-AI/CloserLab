// supabase/functions/send-team-invite/index.ts
import { serve } from "https://deno.land/x/sift@0.6.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response("Unauthorized", { status: 401 });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Verify the calling user
  const { data: { user }, error: authError } = await supabase.auth.getUser(
    authHeader.replace("Bearer ", "")
  );
  if (authError || !user) return new Response("Unauthorized", { status: 401 });

  const { invite_id } = await req.json();
  if (!invite_id) return new Response(JSON.stringify({ error: "invite_id required" }), { status: 400 });

  // Fetch invite + team + inviter name
  const { data: invite, error: inviteError } = await supabase
    .from("team_invites")
    .select("*, teams(name), profiles!team_invites_invited_by_fkey(name)")
    .eq("id", invite_id)
    .single();

  if (inviteError || !invite) {
    return new Response(JSON.stringify({ error: "Invite not found" }), { status: 404 });
  }

  const teamName = invite.teams?.name ?? "your team";
  const inviterName = invite.profiles?.name ?? "Someone";
  const inviteUrl = `${req.headers.get("origin") ?? "https://closerlab.net"}/join/${invite.token}`;

  const emailRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "CloserLab <noreply@closerlab.net>",
      to: [invite.email],
      subject: `${inviterName} invited you to join ${teamName} on CloserLab`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#0a0a0a;color:#f5f5f5;border-radius:12px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:32px;">
            <div style="background:linear-gradient(135deg,#a3e635,#65a30d);width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;">
              <span style="color:#0a0a0a;font-weight:900;font-size:16px;">⚡</span>
            </div>
            <span style="font-weight:900;font-size:18px;letter-spacing:-0.5px;">CLOSER<span style="color:#a3e635;">LAB</span></span>
          </div>

          <h1 style="font-size:24px;font-weight:900;margin:0 0 8px;color:#f5f5f5;">You're invited to train with ${teamName}</h1>
          <p style="color:#737373;margin:0 0 32px;font-size:14px;line-height:1.6;">
            <strong style="color:#f5f5f5;">${inviterName}</strong> has invited you to join their sales team on CloserLab — the AI sales training platform.
          </p>

          <a href="${inviteUrl}" style="display:block;background:linear-gradient(135deg,#a3e635,#65a30d);color:#0a0a0a;font-weight:900;font-size:14px;text-transform:uppercase;letter-spacing:0.08em;text-decoration:none;text-align:center;padding:14px 24px;border-radius:8px;margin-bottom:24px;">
            Accept Invitation
          </a>

          <p style="color:#525252;font-size:12px;margin:0;">
            Or paste this link in your browser:<br/>
            <a href="${inviteUrl}" style="color:#a3e635;word-break:break-all;">${inviteUrl}</a>
          </p>

          <hr style="border:none;border-top:1px solid #262626;margin:24px 0;"/>
          <p style="color:#525252;font-size:11px;margin:0;">
            This invite expires on ${new Date(invite.expires_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}.
            If you didn't expect this, you can ignore this email.
          </p>
        </div>
      `,
    }),
  });

  if (!emailRes.ok) {
    const err = await emailRes.json();
    console.error("Resend error:", err);
    return new Response(JSON.stringify({ error: "Failed to send email" }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
});