import { useState } from "react";
import { Check, Zap, Crown, Mic, Loader2, ChevronUp, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";

const PRICES = {
  starter_monthly: "price_1T9rpNPNpQaZotKHqrLD9fnS",
  starter_yearly:  "price_1T9rrSPNpQaZotKHNxsyxpAD",
  pro_monthly:     "price_1T9rx3PNpQaZotKHzAmrOT3F",
  pro_yearly:      "price_1T9s39PNpQaZotKHp1Ji6V5m",
  team_monthly:    "price_1TKbYMPNpQaZotKHxkabbGSp",
  team_yearly:     "price_1TKczKPNpQaZotKHP7GWDSPQ",
};

const TEAM_PRICE_IDS = new Set([PRICES.team_monthly, PRICES.team_yearly]);

const PLANS = [
  {
    id: "pro",
    name: "Pro",
    monthlyPrice: "€29.99",
    yearlyPrice: "€251",
    period: "/month per seat",
    description: "For individual closers & small teams.",
    features: [
      "Real-time AI roleplay",
      "AI call scoring & feedback",
      "Metrics & insights",
      "180 roleplay minutes each month per seat",
    ],
    cta: "Go Pro",
    highlighted: true,
    badge: false,
    priceId: { monthly: PRICES.team_monthly, yearly: PRICES.team_yearly },
    trial: null,
  },
  {
    id: "enterprise",
    name: "Custom pricing",
    monthlyPrice: "Enterprise",
    yearlyPrice: "Enterprise",
    description: "For teams that want to train together. Contact us for custom plans and pricing.",
    features: [
      "Everything in Pro",
      "Team management dashboard",
      "Admin controls & permissions",
      "Team performance analytics",
      "Custom reporting",
      "Dedicated support",
    ],
    cta: "Contact Us",
    highlighted: false,
    badge: null,
  },
];

export default function Pricing() {
  const { profile } = useProfile();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [seats, setSeats] = useState(1);

  const handleCheckout = async (priceId: string | null) => {
    if (!priceId) return;
    setLoadingPlan(priceId);
    try {
      const isTeamPrice = TEAM_PRICE_IDS.has(priceId);
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: isTeamPrice ? { priceId, seats } : { priceId },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (e) {
      console.error("Checkout error:", e);
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleManageSubscription = async () => {
    setLoadingPlan("manage");
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (e) {
      console.error("Portal error:", e);
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="container mx-auto max-w-5xl px-4 py-16 space-y-12 animate-slide-up">
      {/* Header */}
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-black tracking-tight text-foreground">
          Stop practicing for free.<br />
          <span className="text-primary text-glow">Start closing for real.</span>
        </h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          The best closers train relentlessly. Your competition isn't sleeping.
        </p>
      </div>

      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-1 rounded-lg border border-border bg-card p-1 w-fit mx-auto">
        <button
          onClick={() => setBillingCycle("monthly")}
          className={`px-5 py-2 rounded-md text-sm font-semibold transition-colors ${
            billingCycle === "monthly"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => setBillingCycle("yearly")}
          className={`px-5 py-2 rounded-md text-sm font-semibold transition-colors ${
            billingCycle === "yearly"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Yearly <span className={`text-xs ml-1 ${billingCycle === "yearly" ? "text-primary-foreground/80" : "text-accent"}`}>Save 30%</span>
        </button>
      </div>

      {/* Plans grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {PLANS.map((plan) => {
          const isCurrentPro = profile?.is_pro && plan.id === "pro";
          const isTeamPlan = plan.id === "pro";
          const isCurrentFree = !profile?.is_pro && plan.id === "free";
          const selectedPriceId = plan.priceId?.[billingCycle] ?? null;
          const displayPrice = isTeamPlan
            ? (billingCycle === "yearly" ? "€251" : "€29.99")
            : (billingCycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice);
          const displayPeriod = billingCycle === "yearly" && plan.id !== "enterprise" ? "/year per seat" : plan.period;

          return (
            <div
              key={plan.id}
              className={`relative rounded-xl border p-8 space-y-6 transition-all flex flex-col ${
                plan.highlighted
                  ? "border-primary bg-primary/5 card-glow scale-[1.02]"
                  : "border-border bg-card card-glow-hover"
              }`}
            >
              {/* Badge */}
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full gradient-primary px-3 py-1 text-xs font-bold text-primary-foreground uppercase tracking-wider whitespace-nowrap">
                  <Crown className="h-3 w-3" /> {plan.badge}
                </div>
              )}

              {/* Plan header */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-xl font-black text-foreground">{plan.name}</h3>
                  {plan.id === "pro" && <Mic className="h-4 w-4 text-primary" />}
                </div>
                {plan.trial && (
                  <div className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary mt-2">
                    ✦ {plan.trial}
                  </div>
                )}
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-4xl font-black text-foreground">{displayPrice}</span>
                  {plan.period !== "forever" && (
                    <span className="text-muted-foreground text-sm">{displayPeriod}</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
              </div>

              {/* Features */}
              <ul className="space-y-2.5 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                    <Check className={`h-4 w-4 flex-shrink-0 mt-0.5 ${plan.highlighted ? "text-primary" : "text-muted-foreground"}`} />
                    {f}
                  </li>
                ))}
              </ul>

              {isTeamPlan && (
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground flex-shrink-0">Seats:</span>
                    <div className="flex items-center border border-border rounded-lg overflow-hidden bg-background">
                      <button
                        onClick={() => setSeats((s) => Math.max(1, s - 1))}
                        className="px-2.5 py-1.5 text-muted-foreground hover:bg-secondary transition-colors"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={500}
                        value={seats}
                        onChange={(e) => setSeats(Math.max(1, Math.min(500, parseInt(e.target.value) || 1)))}
                        className="w-14 py-1.5 text-sm font-bold text-foreground tabular-nums text-center bg-background border-x border-border focus:outline-none"
                      />
                      <button
                        onClick={() => setSeats((s) => Math.min(500, s + 1))}
                        className="px-2.5 py-1.5 text-muted-foreground hover:bg-secondary transition-colors"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <span className="text-xs font-bold text-foreground">
                      = €{(billingCycle === "monthly" ? seats * 29.99 : seats * 251).toFixed(2)}/{billingCycle === "monthly" ? "mo" : "yr"}
                    </span>
                  </div>
                </div>
              )}

              {/* CTA */}
              {plan.id === "enterprise" ? (
                <a
                  href="mailto:niilas.tyni80@gmail.com"
                  className="w-full rounded-lg py-3 font-bold text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 border border-border bg-secondary text-foreground hover:bg-primary/10 hover:border-primary/30"
                >
                  Contact Sales
                </a>
              ) : isCurrentPro ? (
                <button
                  onClick={handleManageSubscription}
                  disabled={loadingPlan === "manage"}
                  className="w-full rounded-lg py-3 font-bold text-sm uppercase tracking-wider transition-all gradient-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {loadingPlan === "manage" ? (
                    <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                  ) : "Manage Subscription"}
                </button>
              ) : (
                <button
                  onClick={() => handleCheckout(selectedPriceId)}
                  disabled={!!loadingPlan}
                  className={`w-full rounded-lg py-3 font-bold text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                    plan.highlighted
                      ? "gradient-primary text-primary-foreground hover:opacity-90"
                      : "border border-border bg-secondary text-foreground hover:bg-primary/10 hover:border-primary/30"
                  } disabled:opacity-50`}
                >
                  {loadingPlan === selectedPriceId ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Zap className="h-4 w-4" />
                      {plan.cta}
                    </>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Trust line */}
      <p className="text-center text-sm text-muted-foreground">
        No contracts. Cancel anytime. Prices in EUR.
      </p>
    </div>
  );
}