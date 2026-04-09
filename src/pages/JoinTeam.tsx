import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Zap, CheckCircle, XCircle, Loader2, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTeam } from "@/hooks/useTeam";

type Phase = "loading" | "confirm" | "joining" | "success" | "error";

export const INVITE_TOKEN_KEY = "cl_pending_invite_token";

export default function JoinTeam() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { fetchTeam } = useTeam();

  const [phase, setPhase] = useState<Phase>("loading");
  const [invite, setInvite] = useState<{ teamName: string; inviterName: string; email: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  // Validate token on mount
  useEffect(() => {
    if (!token) { setPhase("error"); setErrorMsg("No invite token found."); return; }
    validateToken();
  }, [token]);

  // Auto-join if already logged in with the right email
  useEffect(() => {
    if (phase === "confirm" && user && invite && user.email === invite.email) {
      joinTeam();
    }
  }, [phase, user, invite]);

  async function validateToken() {
    setPhase("loading");
    try {
      const { data, error } = await (supabase as any).rpc("get_invite_details", { p_token: token });
      if (error || !data) {
        setPhase("error");
        setErrorMsg("This invite link is invalid or has expired.");
        return;
      }
      setInvite({ teamName: data.team_name, inviterName: data.inviter_name, email: data.email });
      setPhase("confirm");
    } catch {
      setPhase("error");
      setErrorMsg("Something went wrong. Please try again.");
    }
  }

  async function joinTeam() {
    if (!token || !invite) return;
    setPhase("joining");
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        // Persist token so Auth.tsx can finish the join after sign-in/sign-up
        localStorage.setItem(INVITE_TOKEN_KEY, token);
        navigate("/auth", { state: { joinToken: token, email: invite.email } });
        return;
      }

      const resp = await supabase.functions.invoke("accept-team-invite", {
        body: { token },
      });

      if (resp.error || resp.data?.error) {
        setPhase("error");
        setErrorMsg(resp.data?.error ?? resp.error?.message ?? "Failed to join team.");
        return;
      }

      localStorage.removeItem(INVITE_TOKEN_KEY);
      setPhase("success");
      await fetchTeam(); // make TeamGate see hasTeam=true before we navigate
      setTimeout(() => navigate("/team"), 1500);
    } catch {
      setPhase("error");
      setErrorMsg("An unexpected error occurred.");
    }
  }

  if (phase === "loading" || phase === "joining") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">
            {phase === "joining" ? "Joining team..." : "Verifying invite..."}
          </p>
        </div>
      </div>
    );
  }

  if (phase === "success") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-sm w-full text-center space-y-4 animate-slide-up">
          <CheckCircle className="h-14 w-14 text-primary mx-auto" />
          <h1 className="text-2xl font-black text-foreground">You're in! 🎉</h1>
          <p className="text-muted-foreground text-sm">
            Welcome to <strong className="text-foreground">{invite?.teamName}</strong>. Redirecting you to the team dashboard…
          </p>
        </div>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-sm w-full text-center space-y-4 animate-slide-up">
          <XCircle className="h-14 w-14 text-destructive mx-auto" />
          <h1 className="text-2xl font-black text-foreground">Invite not valid</h1>
          <p className="text-sm text-muted-foreground">{errorMsg}</p>
          <Link to="/" className="inline-flex items-center gap-2 rounded-lg gradient-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90 transition-opacity">
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // phase === "confirm"
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-sm w-full space-y-6 animate-slide-up">
        <div className="flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl gradient-primary">
            <Zap className="h-6 w-6 text-primary-foreground" />
          </div>
        </div>

        <div className="text-center space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-primary">Team Invitation</p>
          <h1 className="text-2xl font-black text-foreground">
            Join <span className="text-primary">{invite?.teamName}</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">{invite?.inviterName}</strong> invited{" "}
            <span className="font-mono text-foreground">{invite?.email}</span> to train together.
          </p>
        </div>

        {user ? (
          user.email === invite?.email ? (
            <button
              onClick={joinTeam}
              className="w-full flex items-center justify-center gap-2 rounded-lg gradient-primary py-3 font-bold text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Accept &amp; Join Team <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <div className="space-y-3">
              <div className="rounded-lg border border-amber-400/30 bg-amber-400/5 px-4 py-3 text-sm text-amber-400/90">
                You're logged in as <strong>{user.email}</strong> but this invite is for{" "}
                <strong>{invite?.email}</strong>. Please sign in with the correct account.
              </div>
              <button
                onClick={async () => { await supabase.auth.signOut(); navigate(`/join/${token}`); }}
                className="w-full rounded-lg border border-border bg-card py-2.5 text-sm font-bold text-foreground hover:bg-secondary transition-colors"
              >
                Sign out and switch account
              </button>
            </div>
          )
        ) : (
          <div className="space-y-3">
            <button
              onClick={() => {
                localStorage.setItem(INVITE_TOKEN_KEY, token!);
                navigate("/auth", { state: { joinToken: token, email: invite?.email } });
              }}
              className="w-full flex items-center justify-center gap-2 rounded-lg gradient-primary py-3 font-bold text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Sign in to accept <ArrowRight className="h-4 w-4" />
            </button>
            <p className="text-center text-xs text-muted-foreground">
              New to CloserLab?{" "}
              <button
                onClick={() => {
                  localStorage.setItem(INVITE_TOKEN_KEY, token!);
                  navigate("/auth", { state: { joinToken: token, email: invite?.email, signUp: true } });
                }}
                className="text-primary font-semibold hover:underline"
              >
                Create an account
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}