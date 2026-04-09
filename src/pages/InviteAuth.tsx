import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Zap, Mail, Lock, User, Loader2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

// Written to localStorage so TeamGate knows to skip the creation form
export const JUST_JOINED_TEAM_KEY = "cl_just_joined_team";

export default function InviteAuth() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [invite, setInvite] = useState<{ teamName: string; inviterName: string; email: string } | null>(null);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null); // null = checking
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [joining, setJoining] = useState(false);

  // ── Step 1: validate the token ────────────────────────────────────────────
  useEffect(() => {
    if (!token) { setTokenValid(false); return; }
    validateToken();
  }, [token]);

  // ── Step 2: if already logged in with matching email, accept immediately ──
  useEffect(() => {
    if (tokenValid && user && invite && user.email === invite.email) {
      acceptInvite();
    }
  }, [tokenValid, user, invite]);

  async function validateToken() {
    try {
      const { data, error } = await (supabase as any).rpc("get_invite_details", { p_token: token });
      if (error || !data) { setTokenValid(false); return; }
      setInvite({ teamName: data.team_name, inviterName: data.inviter_name, email: data.email });
      setEmail(data.email); // pre-fill email
      setTokenValid(true);
    } catch {
      setTokenValid(false);
    }
  }

  async function acceptInvite() {
    if (!token) return;
    setJoining(true);
    try {
      const resp = await supabase.functions.invoke("accept-team-invite", { body: { token } });
      if (resp.error || resp.data?.error) {
        toast({ title: "Could not join team", description: resp.data?.error ?? resp.error?.message, variant: "destructive" });
        setJoining(false);
        return;
      }
      // Tell TeamGate to stand down — this user just joined via invite
      localStorage.setItem(JUST_JOINED_TEAM_KEY, "1");
      navigate("/team", { replace: true });
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
      setJoining(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!invite) return;
    setSubmitting(true);

    if (isSignUp) {
      // Sign up then immediately accept invite
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name: name.trim().substring(0, 100).replace(/[^a-zA-Z0-9 '\-]/g, "") || "Closer" },
          // Skip email confirmation redirect — we handle everything here
          emailRedirectTo: `${window.location.origin}/join/${token}`,
        },
      });
      if (error) {
        toast({ title: "Signup failed", description: error.message, variant: "destructive" });
        setSubmitting(false);
        return;
      }
      // Sign in immediately after sign up (Supabase auto-confirms in some configs)
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        // Email confirmation might be required
        toast({
          title: "Check your email",
          description: "Confirm your account then click the invite link again.",
        });
        setSubmitting(false);
        return;
      }
      // acceptInvite will be triggered by the useEffect above once user is set
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast({ title: "Login failed", description: error.message, variant: "destructive" });
        setSubmitting(false);
        return;
      }
      // acceptInvite triggered by useEffect
    }
    setSubmitting(false);
  }

  // ── Loading state ─────────────────────────────────────────────────────────
  if (tokenValid === null || joining) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-7 w-7 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">
            {joining ? "Joining team..." : "Verifying invite..."}
          </p>
        </div>
      </div>
    );
  }

  // ── Invalid token ─────────────────────────────────────────────────────────
  if (!tokenValid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-sm w-full text-center space-y-4">
          <XCircle className="h-12 w-12 text-destructive mx-auto" />
          <h1 className="text-xl font-black text-foreground">Invite expired or invalid</h1>
          <p className="text-sm text-muted-foreground">Ask your team manager to send a new invite.</p>
          <button
            onClick={() => navigate("/")}
            className="rounded-lg gradient-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Go to CloserLab
          </button>
        </div>
      </div>
    );
  }

  // ── Wrong account logged in ───────────────────────────────────────────────
  if (user && user.email !== invite?.email) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-sm w-full text-center space-y-4">
          <div className="rounded-lg border border-amber-400/30 bg-amber-400/5 px-4 py-4 text-sm text-amber-400/90 text-left">
            You're signed in as <strong>{user.email}</strong> but this invite is for{" "}
            <strong>{invite?.email}</strong>.
          </div>
          <button
            onClick={async () => { await supabase.auth.signOut(); window.location.reload(); }}
            className="w-full rounded-lg border border-border bg-card py-2.5 text-sm font-bold text-foreground hover:bg-secondary transition-colors"
          >
            Sign out and use the right account
          </button>
        </div>
      </div>
    );
  }

  // ── Sign in / sign up form ────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-7 animate-slide-up">

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl gradient-primary">
              <Zap className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Team Invitation</p>
            <h1 className="text-2xl font-black text-foreground">
              Join <span className="text-primary">{invite?.teamName}</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Invited by <strong className="text-foreground">{invite?.inviterName}</strong>
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-lg border border-border bg-card pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          )}

          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-border bg-card pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full rounded-lg border border-border bg-card pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg gradient-primary py-3 font-bold text-sm uppercase tracking-wider text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin mx-auto" />
            ) : isSignUp ? "Create account & join" : "Sign in & join"}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {isSignUp ? "Already have an account?" : "No account yet?"}{" "}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-primary font-semibold hover:underline"
          >
            {isSignUp ? "Sign in" : "Create one"}
          </button>
        </p>
      </div>
    </div>
  );
}