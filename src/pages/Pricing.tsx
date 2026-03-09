import { useState } from "react";
import { Check, Zap, Crown, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";

const MONTHLY_PRICE_ID = "price_1T6Qk0PNpQaZotKH3r78FZtK";
const YEARLY_PRICE_ID = "price_1T6QjzPNpQaZotKHRxHZF8yh";

const PLANS = [
  {
    name: "Free",
    price: "€0",
    period: "forever",
    description: "Dip your toes in. See if you've got what it takes.",
    features: [
      "3 simulations per week",
      "Basic buyer personas",
      "Performance scoring",
      "Skill breakdown",
    ],
    cta: "Current Plan",
    highlighted: false,
    priceId: null,
  },
  {
    name: "Pro",
    price: "€9.99",
    period: "/month",
    yearlyPrice: "€74.99/year",
    description: "Unlimited reps. Advanced personas. Become dangerous.",
    features: [
      "Unlimited simulations",
      "All buyer personas",
      "Advanced analytics",
      "Voice call mode",
      "Priority AI models",
      "Custom scenarios",
      "Weekly coaching reports",
    ],
    cta: "Go Pro",
    highlighted: true,
    priceId: MONTHLY_PRICE_ID,
  },
];

export default function Pricing() {
  const { profile } = useProfile();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  const handleCheckout = async (priceId: string | null) => {
    if (!priceId) return;
    const selectedPrice = billingCycle === "yearly" ? YEARLY_PRICE_ID : priceId;
    setLoadingPlan(selectedPrice);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId: selectedPrice },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
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
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (e) {
      console.error("Portal error:", e);
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="container mx-auto max-w-3xl px-4 py-16 space-y-12 animate-slide-up">
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
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => setBillingCycle("monthly")}
          className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
            billingCycle === "monthly" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => setBillingCycle("yearly")}
          className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
            billingCycle === "yearly" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Yearly <span className="text-accent text-xs ml-1">Save 37%</span>
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {PLANS.map((plan) => {
          const isPro = plan.highlighted;
          const isCurrentPro = profile?.is_pro && isPro;
          const isCurrentFree = !profile?.is_pro && !isPro;

          return (
            <div
              key={plan.name}
              className={`rounded-xl border p-8 space-y-6 transition-all ${
                plan.highlighted
                  ? "border-primary bg-primary/5 card-glow relative"
                  : "border-border bg-card card-glow-hover"
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full gradient-primary px-3 py-1 text-xs font-bold text-primary-foreground uppercase tracking-wider">
                  <Crown className="h-3 w-3" /> Most Popular
                </div>
              )}

              <div>
                <h3 className="text-xl font-black text-foreground">{plan.name}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-black text-foreground">
                    {isPro && billingCycle === "yearly" ? "€74.99" : plan.price}
                  </span>
                  <span className="text-muted-foreground text-sm">
                    {isPro && billingCycle === "yearly" ? "/year" : plan.period}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
              </div>

              <ul className="space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-foreground">
                    <Check className={`h-4 w-4 flex-shrink-0 ${plan.highlighted ? "text-primary" : "text-muted-foreground"}`} />
                    {f}
                  </li>
                ))}
              </ul>

              {isCurrentPro ? (
                <button
                  onClick={handleManageSubscription}
                  disabled={loadingPlan === "manage"}
                  className="w-full rounded-lg py-3 font-bold text-sm uppercase tracking-wider transition-all gradient-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {loadingPlan === "manage" ? (
                    <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                  ) : (
                    "Manage Subscription"
                  )}
                </button>
              ) : isCurrentFree ? (
                <div className="w-full rounded-lg py-3 font-bold text-sm uppercase tracking-wider text-center border border-border bg-secondary text-muted-foreground">
                  Current Plan
                </div>
              ) : (
                <button
                  onClick={() => handleCheckout(plan.priceId)}
                  disabled={!!loadingPlan}
                  className={`w-full rounded-lg py-3 font-bold text-sm uppercase tracking-wider transition-all ${
                    plan.highlighted
                      ? "gradient-primary text-primary-foreground hover:opacity-90"
                      : "border border-border bg-secondary text-foreground hover:bg-primary/10 hover:border-primary/30"
                  } disabled:opacity-50`}
                >
                  {loadingPlan ? (
                    <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Zap className="h-4 w-4" />
                      {plan.cta}
                    </span>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
