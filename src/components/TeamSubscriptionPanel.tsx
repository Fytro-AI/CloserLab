import { useState } from "react";
import { Crown, Users, Zap, Loader2, ChevronUp, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Input } from "./ui/input";

const TEAM_SEAT_PRICE_ID_MONTHLY = "price_1TKbYMPNpQaZotKHxkabbGSp";
const TEAM_SEAT_PRICE_ID_YEARLY = "price_1TKczKPNpQaZotKHP7GWDSPQ";

interface Props {
  team: {
    id: string;
    subscription_status?: string;
    seats?: number;
    seats_used?: number;
  };
  membersCount: number;
}

export default function TeamSubscriptionPanel({ team, membersCount }: Props) {
  const navigate = useNavigate();
  const [seats, setSeats] = useState(Math.max(membersCount, team.seats ?? 1));
  const [loading, setLoading] = useState(false);

  const isActive = ["active", "trialing"].includes(team.subscription_status ?? "");
  const seatsUsed = team.seats_used ?? membersCount;
  const seatsTotal = team.seats ?? 0;
  const pct = seatsTotal > 0 ? Math.min(100, Math.round((seatsUsed / seatsTotal) * 100)) : 0;

  const [interval, setInterval] = useState<"monthly" | "yearly">("monthly");

    const monthlyPrice = seats * 29.99;
    const yearlyPrice  = seats * 251;
    const priceId = interval === "monthly" ? TEAM_SEAT_PRICE_ID_MONTHLY : TEAM_SEAT_PRICE_ID_YEARLY;

  async function handleBuySeats() {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: { priceId, seats },
    });
    if (error || data?.error) {
      console.error(data?.error ?? error);
      setLoading(false);
      return;
    }
    window.open(data.url, "_blank");
    setLoading(false);
  }

  async function handleAdjustSeats() {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("adjust-team-seats", {
      body: { newSeats: seats },
    });
    if (!error && !data?.error) {
      window.location.reload();
    } else {
      console.error(data?.error ?? error);
    }
    setLoading(false);
  }

  async function handleManageBilling() {
    setLoading(true);
    const { data } = await supabase.functions.invoke("customer-portal");
    if (data?.url) window.open(data.url, "_blank");
    setLoading(false);
  }

  // ── Active subscription view ──────────────────────────────────────────────
  if (isActive) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="h-4 w-4 text-primary" />
            <span className="text-sm font-bold text-foreground">Team Pro</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-primary border border-primary/30 bg-primary/10 rounded-full px-2 py-0.5">
              Active
            </span>
          </div>
          <button
            onClick={handleManageBilling}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
          >
            Manage billing
          </button>
        </div>

        {/* Seat usage bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Users className="h-3 w-3" /> {seatsUsed} / {seatsTotal} seats used
            </span>
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${pct}%`,
                background: pct >= 90 ? "hsl(var(--destructive))" : "hsl(var(--primary))",
              }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground">
            €{(seatsTotal * 29.99).toFixed(2)}/month · €29.99 per seat
          </p>
        </div>

        {/* Seat adjuster */}
        <div className="flex items-center gap-3 pt-1">
          <span className="text-xs text-muted-foreground flex-shrink-0">Adjust seats:</span>
          <div className="flex items-center border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setSeats((s) => Math.max(seatsUsed, s - 1))}
              className="px-2.5 py-1.5 text-muted-foreground hover:bg-secondary transition-colors"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            <span className="px-3 py-1.5 text-sm font-bold text-foreground tabular-nums min-w-[3ch] text-center">
              {seats}
            </span>
            <button
              onClick={() => setSeats((s) => Math.min(500, s + 1))}
              className="px-2.5 py-1.5 text-muted-foreground hover:bg-secondary transition-colors"
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
          </div>
          <button
            onClick={handleAdjustSeats}
            disabled={loading || seats === seatsTotal}
            className="flex items-center gap-1.5 rounded-lg gradient-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Update"}
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground/60">
          Can't go below current member count ({seatsUsed}). Increases are billed prorated immediately.
        </p>
      </div>
    );
  }

  // ── No subscription — buy flow ────────────────────────────────────────────
  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-4">
        <div className="space-y-1">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
            <Crown className="h-4 w-4 text-primary" />
            <span className="text-sm font-bold text-foreground">Upgrade to Team Pro</span>
            </div>
            {/* Interval toggle */}
            <div className="flex items-center rounded-lg border border-border overflow-hidden">
            {(["monthly", "yearly"] as const).map((iv) => (
                <button
                key={iv}
                onClick={() => setInterval(iv)}
                className={`px-3 py-1.5 text-xs font-bold transition-colors ${
                    interval === iv
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                >
                {iv === "monthly" ? "Monthly" : "Yearly"}
                {iv === "yearly" && (
                    <span className="ml-1 text-[9px] font-black opacity-80">−30%</span>
                )}
                </button>
            ))}
            </div>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
            Everyone on your team gets full Pro access — voice calls, unlimited personas, scoring, and performance tracking.
        </p>
        </div>

        <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground flex-shrink-0">Seats:</span>
        <div className="flex items-center border border-border rounded-lg overflow-hidden bg-background">
            <button onClick={() => setSeats((s) => Math.max(1, s - 1))} className="px-2.5 py-1.5 text-muted-foreground hover:bg-secondary transition-colors">
            <ChevronDown className="h-3.5 w-3.5" />
            </button>
            <span className="px-3 py-1.5 text-sm font-bold text-foreground tabular-nums min-w-[3ch]">
              <Input className="text-center" value={seats} onChange={(e) => setSeats(Math.max(1, Math.min(500, parseInt(e.target.value) || 1)))} />
            </span>
            <button onClick={() => setSeats((s) => Math.min(500, s + 1))} className="px-2.5 py-1.5 text-muted-foreground hover:bg-secondary transition-colors">
            <ChevronUp className="h-3.5 w-3.5" />
            </button>
        </div>
        <span className="text-xs font-bold text-foreground">
            = €{(interval === "monthly" ? monthlyPrice : yearlyPrice).toFixed(2)}/{interval === "monthly" ? "mo" : "yr"}
        </span>
        </div>

        <button
        onClick={handleBuySeats}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 rounded-lg gradient-primary py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
        {loading ? "Opening checkout…" : `Subscribe — ${seats} seat${seats > 1 ? "s" : ""}`}
        </button>
        <p className="text-[10px] text-muted-foreground/60 text-center">
        {interval === "monthly" ? "Billed monthly. Cancel anytime." : "Billed yearly. Best value."} Prorated when you add or remove seats.
        </p>
    </div>
    );
}