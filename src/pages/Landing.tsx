import { Link } from "react-router-dom";
import {
  Zap, Target, Shield, TrendingUp, Users, Crown, Check, X,
  ChevronRight, Star, ArrowRight, Crosshair, Brain, BarChart3,
  Flame, Trophy, Swords,
} from "lucide-react";

/* ─── HERO ─── */
function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden px-4">
      {/* Animated gradient bg */}
      <div className="absolute inset-0 bg-background" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-primary/5 blur-[120px] animate-pulse-glow" />
      <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-accent/5 blur-[100px] animate-pulse-glow" style={{ animationDelay: "1s" }} />

      <div className="relative z-10 max-w-4xl mx-auto text-center space-y-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-semibold text-primary">
          <Flame className="h-4 w-4" /> AI Sales Training Platform
        </div>

        <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight text-foreground leading-[1.1]">
          Train Like the<br />
          <span className="text-primary text-glow">Deal </span>
          <span className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight text-foreground leading-[1.1]">
            Depends On It.</span>
        </h1>

        <p className="max-w-2xl mx-auto text-lg sm:text-xl text-muted-foreground leading-relaxed">
          CloserLab is the <span className="text-foreground font-semibold">AI Sales Dojo</span> where you train before the real call.
          Simulate tough buyers. Get scored. Fix your weaknesses. Level up.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            to="/auth"
            className="group flex items-center gap-2 rounded-lg gradient-primary px-8 py-4 text-base font-bold uppercase tracking-wider text-primary-foreground transition-all hover:opacity-90 hover:scale-105"
          >
            <Flame className="h-5 w-5" /> Start Training Free
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <a
            href="#how-it-works"
            className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-8 py-4 text-base font-semibold text-foreground transition-all hover:border-primary/30 hover:bg-primary/5"
          >
            See How It Works <ChevronRight className="h-4 w-4" />
          </a>
        </div>

        <p className="text-sm text-muted-foreground">No credit card required.</p>
      </div>
    </section>
  );
}

/* ─── THE PROBLEM ─── */
function ProblemSection() {
  const problems = [
    "You hesitate under pressure",
    "You justify price too early",
    "You lose control of the frame",
    'You "wing it" and hope',
  ];

  return (
    <section className="py-24 px-4">
      <div className="max-w-3xl mx-auto text-center space-y-12">
        <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-foreground">
          Most reps practice on <span className="text-destructive">real prospects.</span>
        </h2>

        <div className="space-y-4 max-w-md mx-auto">
          {problems.map((p) => (
            <div key={p} className="flex items-center gap-3 text-lg text-muted-foreground">
              <X className="h-5 w-5 text-destructive flex-shrink-0" />
              <span>{p}</span>
            </div>
          ))}
        </div>

        <div className="pt-4">
          <p className="text-2xl sm:text-3xl font-black text-foreground">
            Hope is not a strategy.{" "}
            <span className="text-primary text-glow">Practice is.</span>
          </p>
        </div>
      </div>
    </section>
  );
}

/* ─── HOW IT WORKS ─── */
function HowItWorks() {
  const steps = [
    {
      icon: Crosshair,
      number: "01",
      title: "Choose Your Battle",
      description: "Select industry, buyer persona, difficulty, and deal type. Every rep is different, your training should be too.",
    },
    {
      icon: Swords,
      number: "02",
      title: "Enter The Simulation",
      description: "AI buyer pushes back, interrupts, hangs up on you, objects, tests you. No scripts, no safety net, just pressure.",
    },
    {
      icon: Brain,
      number: "03",
      title: "Get Brutally Honest Feedback",
      description: "Structured scoring across Objection Handling, Confidence, Framing Control, Closing, and Clarity.",
    },
  ];

  return (
    <section id="how-it-works" className="py-24 px-4 bg-card/30">
      <div className="max-w-6xl mx-auto space-y-16">
        <div className="text-center space-y-4">
          <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-foreground">
            How It <span className="text-primary text-glow">Works</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Three steps. Zero excuses.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.number}
              className="group relative rounded-xl border border-border bg-card p-8 space-y-4 transition-all hover:border-primary/30 card-glow-hover"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-mono font-bold text-primary">{step.number}</span>
                <step.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-xl font-black text-foreground">{step.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>

        {/* Screenshot placeholders */}
        <div className="grid gap-6 md:grid-cols-3">
          {["Simulation Screen", "Skill Radar Chart", "Dashboard Progression"].map((label) => (
            <div
              key={label}
              className="aspect-video rounded-xl border border-border bg-secondary/50 flex items-center justify-center"
            >
              <span className="text-sm text-muted-foreground font-medium">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── MEASURABLE PROGRESSION ─── */
function ProgressionSection() {
  const ranks = [
    { name: "Rookie", icon: "🟢", xp: "0" },
    { name: "Setter", icon: "🔵", xp: "500" },
    { name: "Closer", icon: "🟣", xp: "1,500" },
    { name: "Shark", icon: "🔴", xp: "3,500" },
    { name: "Wolf", icon: "🐺", xp: "7,000" },
    { name: "Apex", icon: "🦅", xp: "12000", },
    { name: "Titan", icon: "⚡", xp: "20000" },
    { name: "Phantom", icon: "👻", xp: "35000" },
    { name: "Legend", icon: "🔱", xp: "55000" },
    { name: "Godfather", icon: "👑", xp: "100000" },
  ];

  return (
    <section className="py-24 px-4">
      <div className="max-w-5xl mx-auto space-y-16">
        <div className="text-center space-y-4">
          <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-foreground">
            Track Your Growth<br />
            <span className="text-primary text-glow">Like An Athlete.</span>
          </h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Zap, label: "XP System", desc: "Earn points for every simulation" },
            { icon: Trophy, label: "Rank Progression", desc: "Climb from Rookie to Godfather" },
            { icon: BarChart3, label: "Skill Heatmap", desc: "See strengths and gaps" },
            { icon: TrendingUp, label: "Performance Trends", desc: "Track improvement over time" },
          ].map((f) => (
            <div key={f.label} className="rounded-xl border border-border bg-card p-6 space-y-3 card-glow-hover transition-all">
              <f.icon className="h-6 w-6 text-primary" />
              <h3 className="font-bold text-foreground">{f.label}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Rank ladder */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {ranks.map((r, i) => (
            <div key={r.name} className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2">
                <span className="text-lg">{r.icon}</span>
                <div>
                  <p className="text-sm font-bold text-foreground">{r.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{r.xp} XP</p>
                </div>
              </div>
              {i < ranks.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </div>
          ))}
        </div>

        <p className="text-center text-xl font-bold text-foreground">
          This isn't motivation. <span className="text-primary">It's measurable improvement.</span>
        </p>
      </div>
    </section>
  );
}

/* ─── FOR TEAMS ─── */
function TeamsSection() {
  const features = [
    "Track rep performance across scenarios",
    "Identify individual skill gaps instantly",
    "Weekly AI coaching reports",
    "Rank your team internally",
    "Reduce onboarding ramp time by 40%",
  ];

  return (
    <section className="py-24 px-4 bg-card/30">
      <div className="max-w-4xl mx-auto space-y-12">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5 text-sm font-semibold text-accent">
            <Users className="h-4 w-4" /> For Sales Leaders
          </div>
          <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-foreground">
            Built For Sales Teams<br />
            <span className="text-accent">Who Want Results.</span>
          </h2>
        </div>

        <div className="rounded-xl border border-border bg-card p-8 sm:p-12 space-y-6">
          <ul className="space-y-4">
            {features.map((f) => (
              <li key={f} className="flex items-center gap-3 text-foreground">
                <Check className="h-5 w-5 text-accent flex-shrink-0" />
                <span className="text-lg">{f}</span>
              </li>
            ))}
          </ul>

        </div>
      </div>
    </section>
  );
}

function PricingSection() {
  const plans = [
    {
      name: "Free",
      price: "€0",
      period: "forever",
      features: [
        "3 practice calls total",
        "Text simulations",
        "Basic feedback",
      ],
      cta: "Start Free",
      highlighted: false,
      badge: null,
    },
    {
      name: "Starter",
      price: "€14.99",
      period: "/month",
      features: [
        "Unlimited text simulations",
        "All buyer personas",
        "Full scoring & analytics",
        "Skill progression & XP",
        "Custom scenarios",
      ],
      cta: "Get Starter",
      highlighted: false,
      badge: null,
    },
    {
      name: "Pro",
      price: "€29.99",
      period: "/month",
      features: [
        "Everything in Starter",
        "🎙️ Realtime AI voice calls",
        "45 voice calling minutes/day",
        "Live objection coaching",
        "Weekly coaching reports",
      ],
      cta: "Go Pro",
      highlighted: true,
      badge: "Most Popular",
    },
  ];

  return (
    <section id="pricing" className="py-24 px-4">
      <div className="max-w-5xl mx-auto space-y-12">
        <div className="text-center space-y-4">
          <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-foreground">
            Simple <span className="text-primary text-glow">Pricing</span>
          </h2>
          <p className="text-muted-foreground text-lg">No contracts. Cancel anytime.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-xl border p-8 space-y-6 transition-all flex flex-col ${
                plan.highlighted
                  ? "border-primary bg-primary/5 card-glow scale-[1.02]"
                  : "border-border bg-card card-glow-hover"
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full gradient-primary px-3 py-1 text-xs font-bold text-primary-foreground uppercase tracking-wider whitespace-nowrap">
                  <Crown className="h-3 w-3" /> {plan.badge}
                </div>
              )}

              <div>
                <h3 className="text-xl font-black text-foreground">{plan.name}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-black text-foreground">{plan.price}</span>
                  <span className="text-muted-foreground text-sm">{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-2.5 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                    <Check className={`h-4 w-4 flex-shrink-0 mt-0.5 ${plan.highlighted ? "text-primary" : "text-muted-foreground"}`} />
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                to="/auth"
                className={`block w-full rounded-lg py-3 text-center font-bold text-sm uppercase tracking-wider transition-all ${
                  plan.highlighted
                    ? "gradient-primary text-primary-foreground hover:opacity-90"
                    : "border border-border bg-secondary text-foreground hover:bg-primary/10 hover:border-primary/30"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── SOCIAL PROOF ─── */
function SocialProof() {
  return (
    <section className="py-24 px-4 bg-card/30">
      <div className="max-w-4xl mx-auto space-y-12">
        <div className="text-center space-y-4">
          <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-foreground">
            Built For Closers Who Refuse<br />
            <span className="text-primary text-glow">To Stay Average.</span>
          </h2>
        </div>

        <div className="rounded-xl border border-primary/20 bg-primary/5 p-10 text-center space-y-4">
          <div className="text-6xl sm:text-7xl font-black text-primary text-glow">+30%</div>
          <p className="text-xl sm:text-2xl font-bold text-foreground">
            Testers increased their confidence score by 30% in 2 weeks.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ─── FINAL CTA ─── */
function FinalCTA() {
  return (
    <section className="py-24 px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-background" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[100px]" />

      <div className="relative z-10 max-w-3xl mx-auto text-center space-y-8">
        <h2 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-foreground">
          Your Next Deal<br />
          <span className="text-primary text-glow">Won't Close Itself.</span>
        </h2>
        <p className="text-xl text-muted-foreground">
          Train before the call. Dominate during it.
        </p>

        <Link
          to="/auth"
          className="group inline-flex items-center gap-2 rounded-lg gradient-primary px-10 py-4 text-base font-bold uppercase tracking-wider text-primary-foreground transition-all hover:opacity-90 hover:scale-105"
        >
          <Flame className="h-5 w-5" /> Start Training Free
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>

        <p className="text-sm text-muted-foreground">No credit card required.</p>
      </div>
    </section>
  );
}

/* ─── FOOTER ─── */
function Footer() {
  return (
    <footer className="border-t border-border py-8 px-4">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded gradient-primary">
            <Zap className="h-3 w-3 text-primary-foreground" />
          </div>
          <span className="text-sm font-bold text-foreground">
            CLOSER<span className="text-primary">LAB</span>
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} CloserLab. Train harder. Close faster.
        </p>
      </div>
    </footer>
  );
}

/* ─── LANDING PAGE ─── */
export default function Landing() {
  return (
    <div className="bg-background text-foreground scroll-smooth">
      {/* Landing navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md gradient-primary">
              <Zap className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-black tracking-tight text-foreground">
              CLOSER<span className="text-primary">LAB</span>
            </span>
          </div>

          <div className="flex items-center gap-1">
            <a href="#how-it-works" className="hidden sm:inline-flex rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              How It Works
            </a>
            <a href="#pricing" className="hidden sm:inline-flex rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </a>
            <Link
              to="/auth"
              className="rounded-md gradient-primary px-4 py-1.5 text-sm font-bold text-primary-foreground transition-all hover:opacity-90"
            >
              Start Free
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-14">
        <Hero />
        <ProblemSection />
        <HowItWorks />
        <ProgressionSection />
        <TeamsSection />
        <PricingSection />
        <SocialProof />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
