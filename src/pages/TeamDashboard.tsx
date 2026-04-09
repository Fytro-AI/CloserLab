import { useState, useEffect } from "react";
import {
  Users, Target, Mail, Crown, X,
  Copy, Check, Trash2, Phone, Zap, UserPlus, Activity,
  ChevronDown, ChevronLeft, ChevronRight, Settings2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { getRank } from "@/lib/game-data";
import { toast } from "@/components/ui/sonner";

/* ─── Constants ─── */
const SALES_ROLES = [
  { value: "owner",             label: "Owner",             color: "text-amber-400"        },
  { value: "administrator",     label: "Administrator",     color: "text-primary"          },
  { value: "sales_manager",     label: "Sales Manager",     color: "text-primary"          },
  { value: "account_executive", label: "Account Executive", color: "text-foreground"       },
  { value: "account_manager",   label: "Account Manager",  color: "text-foreground"       },
  { value: "sdr",               label: "SDR",               color: "text-foreground"       },
  { value: "bdr",               label: "BDR",               color: "text-foreground"       },
  { value: "member",            label: "Member",            color: "text-muted-foreground" },
] as const;

type SalesRole = (typeof SALES_ROLES)[number]["value"];

function roleLabel(r: string) { return SALES_ROLES.find((x) => x.value === r)?.label ?? r; }
function roleColor(r: string) { return SALES_ROLES.find((x) => x.value === r)?.color ?? "text-muted-foreground"; }

/* ─── Types ─── */
interface Member {
  user_id: string;
  name: string;
  team_role: string;
  xp: number;
  calls_completed: number;
  skill_objection_handling: number;
  skill_confidence: number;
  skill_clarity: number;
  skill_closing: number;
}

interface Invite {
  id: string;
  email: string;
  token: string;
  status: string;
  created_at: string;
  expires_at: string;
}

interface CallStat {
  user_id: string;
  total: number;
  avg_score: number;
  avg_obj: number;
  avg_conf: number;
  avg_clarity: number;
  avg_closing: number;
}

/* ─── Helpers ─── */
function scoreColor(s: number) {
  if (s >= 70) return "text-primary";
  if (s >= 50) return "text-amber-400";
  return "text-destructive";
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={`font-bold ${scoreColor(value)}`}>{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${value}%`,
            background: value >= 70 ? "hsl(var(--primary))" : value >= 50 ? "hsl(40 95% 60%)" : "hsl(var(--destructive))",
          }}
        />
      </div>
    </div>
  );
}

/* ─── Manage Member Modal ─── */
function ManageMemberModal({ member, isOwner, isMe, onRoleChange, onRemove, onClose }: {
  member: Member;
  isOwner: boolean;
  isMe: boolean;
  onRoleChange: (role: SalesRole) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const rank = getRank(member.xp);
  const isThisOwner = member.team_role === "owner";
  const assignable = SALES_ROLES.filter((r) => r.value !== "owner");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm mx-4 rounded-xl border border-border bg-card p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 pr-6">
          <div className="h-10 w-10 flex items-center justify-center rounded-full bg-secondary text-lg flex-shrink-0">
            {rank.icon}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-foreground truncate">{member.name}</p>
            <p className={`text-xs font-semibold ${roleColor(member.team_role)}`}>
              {roleLabel(member.team_role)}
              {isThisOwner && <span className="ml-1 text-muted-foreground font-normal">· Team Owner</span>}
            </p>
          </div>
        </div>

        {/* Role section */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Role</p>
          {isThisOwner ? (
            <p className="text-xs text-amber-400/80 bg-amber-400/5 border border-amber-400/20 rounded-lg px-3 py-2">
              The team owner's role cannot be changed.
            </p>
          ) : isMe ? (
            <p className="text-xs text-muted-foreground/60 bg-secondary/40 border border-border rounded-lg px-3 py-2">
              You cannot change your own role.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-1.5">
              {assignable.map((r) => (
                <button
                  key={r.value}
                  onClick={() => { onRoleChange(r.value); onClose(); }}
                  className={`rounded-lg border px-3 py-2 text-xs font-semibold text-left transition-all ${
                    member.team_role === r.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Remove */}
        {isOwner && !isMe && !isThisOwner && (
          <button
            onClick={() => { onClose(); onRemove(); }}
            className="w-full rounded-lg border border-destructive/30 bg-destructive/5 py-2.5 text-sm font-bold text-destructive hover:bg-destructive/10 transition-colors"
          >
            Remove from team
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Member Row ─── */
function MemberRow({ member, stat, isOwner, isMe, onRemove, onRoleChange }: {
  member: Member;
  stat?: CallStat;
  isOwner: boolean;
  isMe: boolean;
  onRemove: () => void;
  onRoleChange: (role: SalesRole) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [managing, setManaging] = useState(false);
  const rank = getRank(member.xp);
  const isThisOwner = member.team_role === "owner";

  return (
    <>
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {/* Main thin row */}
        <div className="flex items-center gap-3 px-4 py-2.5">
          {/* Left clickable area → expand */}
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex-1 min-w-0 flex items-center gap-3 text-left"
          >
            <span className="text-base flex-shrink-0 w-6 text-center">{rank.icon}</span>
            <div className="flex-1 min-w-0 flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground truncate">{member.name}</span>
              {isMe && <span className="text-[10px] text-muted-foreground/40 font-normal flex-shrink-0">(you)</span>}
              {isThisOwner && <Crown className="h-3 w-3 text-amber-400 flex-shrink-0" />}
            </div>
            <span className={`hidden sm:inline text-[11px] font-bold flex-shrink-0 ${roleColor(member.team_role)}`}>
              {roleLabel(member.team_role)}
            </span>
            <div className="hidden md:flex items-center gap-4 flex-shrink-0 text-xs text-muted-foreground">
              <span className="tabular-nums">{member.calls_completed} calls</span>
              <span className="tabular-nums">{member.xp.toLocaleString()} XP</span>
              {stat?.total ? (
                <span className={`font-black tabular-nums ${scoreColor(stat.avg_score)}`}>{stat.avg_score} avg</span>
              ) : (
                <span className="text-muted-foreground/30">−</span>
              )}
            </div>
            <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground/30 flex-shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>

          {/* Manage button */}
          <button
            onClick={() => setManaging(true)}
            className="flex-shrink-0 flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
          >
            <Settings2 className="h-3 w-3" />
            <span className="hidden sm:inline">Manage</span>
          </button>
        </div>

        {/* Expanded skill detail */}
        {expanded && (
          <div className="px-4 pb-4 pt-1 border-t border-border space-y-3 bg-secondary/10">
            {stat?.total ? (
              <>
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                  <span>{stat.total} calls last 30 days</span>
                  <span className={`font-black text-sm ${scoreColor(stat.avg_score)}`}>{stat.avg_score} avg</span>
                </div>
                <ScoreBar label="Objection Handling" value={stat.avg_obj} />
                <ScoreBar label="Confidence"         value={stat.avg_conf} />
                <ScoreBar label="Clarity"            value={stat.avg_clarity} />
                <ScoreBar label="Closing"            value={stat.avg_closing} />
              </>
            ) : (
              <p className="text-xs text-muted-foreground/40 pt-1">No calls in the last 30 days</p>
            )}
          </div>
        )}
      </div>

      {/* Manage modal rendered outside the row */}
      {managing && (
        <ManageMemberModal
          member={member}
          isOwner={isOwner}
          isMe={isMe}
          onRoleChange={onRoleChange}
          onRemove={onRemove}
          onClose={() => setManaging(false)}
        />
      )}
    </>
  );
}

const MEMBERS_PER_PAGE = 10;

/* ─── MAIN ─── */
export default function TeamDashboard() {
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile();

  const [team, setTeam] = useState<any>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [callStats, setCallStats] = useState<Record<string, CallStat>>({});
  const [loading, setLoading] = useState(true);
  const [membersPage, setMembersPage] = useState(1);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const isOwner = profile?.team_role === "owner" || profile?.team_role === "administrator";

  useEffect(() => {
    if (!profileLoading) load();
  }, [profile, profileLoading]);

  async function load() {
    if (!profile?.team_id) { setLoading(false); return; }
    setLoading(true);

    const [teamRes, membersRes, invitesRes] = await Promise.all([
      (supabase as any).from("teams").select("*").eq("id", profile.team_id).single(),
      (supabase as any)
        .from("profiles")
        .select("user_id, name, team_role, xp, calls_completed, skill_objection_handling, skill_confidence, skill_clarity, skill_closing")
        .eq("team_id", profile.team_id),
      isOwner
        ? (supabase as any).from("team_invites").select("*").eq("team_id", profile.team_id).eq("status", "pending").order("created_at", { ascending: false })
        : Promise.resolve({ data: [] }),
    ]);

    setTeam(teamRes.data);
    const mems: Member[] = membersRes.data || [];
    setMembers(mems);
    setInvites(invitesRes.data || []);

    const ago = new Date();
    ago.setDate(ago.getDate() - 30);
    const ids = mems.map((m) => m.user_id);

    if (ids.length) {
      const { data: calls } = await (supabase as any)
        .from("call_history")
        .select("user_id, overall_score, objection_handling_score, confidence_score, clarity_score, closing_score")
        .in("user_id", ids)
        .gte("created_at", ago.toISOString());

      const map: Record<string, CallStat> = {};
      for (const c of calls || []) {
        if (!map[c.user_id]) map[c.user_id] = { user_id: c.user_id, total: 0, avg_score: 0, avg_obj: 0, avg_conf: 0, avg_clarity: 0, avg_closing: 0 };
        map[c.user_id].total++;
        map[c.user_id].avg_score   += c.overall_score;
        map[c.user_id].avg_obj     += c.objection_handling_score;
        map[c.user_id].avg_conf    += c.confidence_score;
        map[c.user_id].avg_clarity += c.clarity_score;
        map[c.user_id].avg_closing += c.closing_score;
      }
      for (const s of Object.values(map)) {
        s.avg_score   = Math.round(s.avg_score   / s.total);
        s.avg_obj     = Math.round(s.avg_obj     / s.total);
        s.avg_conf    = Math.round(s.avg_conf    / s.total);
        s.avg_clarity = Math.round(s.avg_clarity / s.total);
        s.avg_closing = Math.round(s.avg_closing / s.total);
      }
      setCallStats(map);
    }

    setLoading(false);
  }

  async function removeMember(userId: string) {
    if (!confirm("Remove this member from the team?")) return;
    await (supabase as any).from("profiles").update({ team_id: null, team_role: null }).eq("user_id", userId);
    setMembers((p) => p.filter((m) => m.user_id !== userId));
  }

  async function changeRole(userId: string, role: SalesRole) {
    await (supabase as any).from("profiles").update({ team_role: role }).eq("user_id", userId);
    setMembers((prev) => prev.map((m) => m.user_id === userId ? { ...m, team_role: role } : m));
  }

  const [inviteError, setInviteError] = useState<string | null>(null);

  async function sendInvite() {
    if (!inviteEmail.trim() || !user) return;
    setInviteBusy(true);

    // Check via security-definer RPC − direct RLS query only returns the caller's own row
    const { data: isRegistered, error: checkError } = await (supabase as any)
      .rpc("check_email_registered", { p_email: inviteEmail.trim().toLowerCase() });

    if (checkError || !isRegistered) {
      toast.error("Not signed up yet", {
        description: `${inviteEmail.trim()} doesn't have a CloserLab account. Ask them to sign up first.`,
      });
      setInviteBusy(false);
      return;
    }

    const { error } = await (supabase as any)
      .from("team_invites")
      .insert({ team_id: profile?.team_id, invited_by: user.id, email: inviteEmail.trim() });

    if (!error) {
      setInviteSent(true);
      setInviteEmail("");
      setTimeout(() => setInviteSent(false), 3000);
      load();
    }
    setInviteBusy(false);
  }

  async function cancelInvite(id: string) {
    await (supabase as any).from("team_invites").update({ status: "expired" }).eq("id", id);
    load();
  }

  function copyLink(token: string) {
    navigator.clipboard.writeText(`${window.location.origin}/join/${token}`);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  }

  if (profileLoading || loading) return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
      <Zap className="h-6 w-6 text-primary animate-pulse" />
    </div>
  );

  if (!profile?.team_id) return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center text-sm text-muted-foreground">
      No team found.
    </div>
  );

  const active = Object.values(callStats).filter((s) => s.total > 0);
  const totalCalls = Object.values(callStats).reduce((a, s) => a + s.total, 0);
  const activeMems = active.length;
  const avgOf = (key: keyof CallStat) =>
    activeMems ? Math.round(active.reduce((a, s) => a + (s[key] as number), 0) / activeMems) : 0;
  const avgScore = avgOf("avg_score");

  const sortedMembers = [...members].sort(
    (a, b) => (callStats[b.user_id]?.avg_score ?? 0) - (callStats[a.user_id]?.avg_score ?? 0)
  );

  const totalPages = Math.max(1, Math.ceil(sortedMembers.length / MEMBERS_PER_PAGE));
  const pagedMembers = sortedMembers.slice((membersPage - 1) * MEMBERS_PER_PAGE, membersPage * MEMBERS_PER_PAGE);

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl space-y-8 animate-slide-up">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-black text-foreground tracking-tight">{team?.name ?? "Team"}</h1>
          <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-primary border border-primary/30 bg-primary/10 rounded-full px-2 py-0.5">
            <Users className="h-3 w-3" /> Team
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">
          {members.length} members · {team?.size}
          {profile.team_role && (
            <> · <span className={roleColor(profile.team_role)}>{roleLabel(profile.team_role)}</span></>
          )}
        </p>
      </div>

      {/* Compact KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Members",     value: members.length,    icon: Users,    accent: false },
          { label: "Calls / 30d", value: totalCalls || "−", icon: Phone,    accent: false },
          { label: "Avg Score",   value: avgScore || "−",   icon: Target,   accent: avgScore >= 70 },
          { label: "Active Reps", value: activeMems,         icon: Activity, accent: false },
        ].map(({ label, value, icon: Icon, accent }) => (
          <div
            key={label}
            className={`rounded-lg border px-4 py-3 flex items-center gap-3 ${accent ? "border-primary/20 bg-primary/5" : "border-border bg-card"}`}
          >
            <Icon className="h-4 w-4 text-muted-foreground/40 flex-shrink-0" />
            <div className="min-w-0">
              <p className={`text-xl font-black tabular-nums leading-tight ${accent ? "text-primary" : "text-foreground"}`}>{value}</p>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground truncate">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Skill breakdown + leaderboard */}
      {activeMems > 0 && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div>
              <p className="font-black text-foreground text-sm">Team Skill Breakdown</p>
              <p className="text-xs text-muted-foreground">Avg across active reps · last 30 days</p>
            </div>
            <ScoreBar label="Objection Handling" value={avgOf("avg_obj")} />
            <ScoreBar label="Confidence"         value={avgOf("avg_conf")} />
            <ScoreBar label="Clarity"            value={avgOf("avg_clarity")} />
            <ScoreBar label="Closing"            value={avgOf("avg_closing")} />
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-3 border-b border-border">
              <p className="font-black text-foreground text-sm">Rep Ranking</p>
              <p className="text-xs text-muted-foreground">By avg score · last 30 days</p>
            </div>
            <div className="divide-y divide-border">
              {sortedMembers.slice(0, 5).map((m, i) => {
                const s = callStats[m.user_id];
                const rank = getRank(m.xp);
                return (
                  <div key={m.user_id} className="flex items-center gap-3 px-5 py-2.5">
                    <span className={`text-sm font-black w-4 flex-shrink-0 ${i === 0 ? "text-amber-400" : "text-muted-foreground/30"}`}>{i + 1}</span>
                    <span className="text-base flex-shrink-0">{rank.icon}</span>
                    <p className="text-sm font-semibold text-foreground flex-1 truncate">{m.name}</p>
                    <p className={`text-sm font-black tabular-nums flex-shrink-0 ${s?.total ? scoreColor(s.avg_score) : "text-muted-foreground/30"}`}>
                      {s?.total ? s.avg_score : "−"}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Members list */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-black text-foreground">Members</p>
            <p className="text-xs text-muted-foreground">{members.length} total · click a row to see skill breakdown</p>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <button
                onClick={() => setMembersPage((p) => Math.max(1, p - 1))}
                disabled={membersPage === 1}
                className="rounded border border-border p-1 hover:bg-secondary transition-colors disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="tabular-nums">{membersPage} / {totalPages}</span>
              <button
                onClick={() => setMembersPage((p) => Math.min(totalPages, p + 1))}
                disabled={membersPage === totalPages}
                className="rounded border border-border p-1 hover:bg-secondary transition-colors disabled:opacity-40"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {pagedMembers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground/40">
            No members yet − invite your reps below
          </div>
        ) : (
          <div className="space-y-1.5">
            {pagedMembers.map((m) => (
              <MemberRow
                key={m.user_id}
                member={m}
                stat={callStats[m.user_id]}
                isOwner={isOwner}
                isMe={m.user_id === user?.id}
                onRemove={() => removeMember(m.user_id)}
                onRoleChange={(role) => changeRole(m.user_id, role)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Invites (owners only) */}
      {isOwner && (
        <div className="space-y-4">
          <div>
            <p className="font-black text-foreground">Invite Reps</p>
            <p className="text-xs text-muted-foreground mt-0.5">Create a link and send it − they join when they open it.</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendInvite()}
                  placeholder="rep@company.com"
                  className="w-full rounded-lg border border-border bg-background pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary"
                />
                {inviteError && (
                    <p className="text-xs text-destructive">{inviteError}</p>
                )}
              </div>
              <button
                onClick={sendInvite}
                disabled={inviteBusy || !inviteEmail.trim()}
                className="flex items-center gap-1.5 rounded-lg gradient-primary px-4 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-40 transition-opacity"
              >
                {inviteSent ? <Check className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                {inviteSent ? "Done!" : "Create invite"}
              </button>
            </div>
            <p className="text-xs text-muted-foreground/50">After creating, copy the invite link below and send it manually.</p>

            {invites.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-border">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Pending</p>
                {invites.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between rounded-lg border border-border bg-secondary/20 px-3 py-2 gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{inv.email}</p>
                      <p className="text-[10px] text-muted-foreground">Expires {new Date(inv.expires_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <button
                        onClick={() => copyLink(inv.token)}
                        className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/70 transition-colors"
                      >
                        {copied === inv.token ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        {copied === inv.token ? "Copied!" : "Copy link"}
                      </button>
                      <button onClick={() => cancelInvite(inv.id)} className="text-muted-foreground/20 hover:text-destructive transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}