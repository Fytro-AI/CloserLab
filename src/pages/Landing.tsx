import { Link } from "react-router-dom";
import {
  Zap, Check, ArrowRight, Users, Mic, BarChart3,
  Target, Shield, ChevronRight, Phone, TrendingUp, Building2,
} from "lucide-react";

/* ─── NAV ─── */
function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/90 backdrop-blur-xl">
      <div className="container mx-auto flex h-14 items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md gradient-primary">
            <Zap className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="text-base font-black tracking-tight text-foreground">
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
          <Link to="/auth" className="rounded-md gradient-primary px-4 py-1.5 text-sm font-bold text-primary-foreground transition-all hover:opacity-90">
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
}

/* ─── HERO ─── */
function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden px-6 pt-14">
      <div className="absolute inset-0 bg-background" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] rounded-full bg-primary/4 blur-[140px]" />
      <div className="absolute top-1/3 right-1/4 w-[300px] h-[300px] rounded-full bg-accent/4 blur-[100px]" />

      <div className="relative z-10 max-w-5xl mx-auto text-center space-y-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-primary">
          <Users className="h-3.5 w-3.5" /> Built for Sales Teams
        </div>

        <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight text-foreground leading-[1.08]">
          Your reps are practicing<br />
          <span className="text-primary" style={{ textShadow: "0 0 60px hsl(82 100% 57% / 0.25)" }}>
            on real prospects.
          </span>
        </h1>

        <p className="max-w-2xl mx-auto text-lg sm:text-xl text-muted-foreground leading-relaxed">
          CloserLab is AI-powered sales training infrastructure for modern sales teams.
          Build custom buyer personas, run live voice simulations, and track every rep's progress in one platform.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <Link
            to="/auth"
            className="group flex items-center gap-2 rounded-lg gradient-primary px-8 py-4 text-sm font-bold uppercase tracking-wider text-primary-foreground transition-all hover:opacity-90"
          >
            Start Free Trial
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <a
            href="#how-it-works"
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-8 py-4 text-sm font-semibold text-foreground transition-all hover:border-primary/30"
          >
            See How It Works <ChevronRight className="h-4 w-4" />
          </a>
        </div>

        {/* Stat bar */}
        <div className="flex flex-wrap items-center justify-center gap-8 pt-6 border-t border-border/50 mt-8">
          {[
            { value: "10x", label: "More reps per week vs live role-play" },
            { value: "100%", label: "Calls recorded & scored automatically" },
            { value: "< 2min", label: "Setup time per custom persona" },
          ].map(({ value, label }) => (
            <div key={label} className="text-center">
              <div className="text-2xl font-black text-primary">{value}</div>
              <div className="text-xs text-muted-foreground mt-0.5 max-w-[140px] leading-tight">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── PROBLEM ─── */
function Problem() {
  return (
    <section className="py-24 px-6 bg-card/20">
      <div className="max-w-4xl mx-auto space-y-16">
        <div className="text-center space-y-4">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
            Traditional sales training doesn't scale.
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Sales managers spend hours on role-play. New reps go live before they're ready.
            And nobody knows what actually needs fixing until deals are already lost.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-6">
          {[
            {
              problem: "Manual role-play",
              reality: "Manager availability limits how often reps can practice. Most reps get 1–2 sessions a month.",
            },
            {
              problem: "No consistency",
              reality: "Every manager runs role-play differently. There's no standard and no way to compare improvement.",
            },
            {
              problem: "Zero visibility",
              reality: "You don't know if your team is getting better until it's too late – when quota numbers land.",
            },
          ].map(({ problem, reality }) => (
            <div key={problem} className="rounded-xl border border-border bg-card p-6 space-y-3">
              <div className="text-xs font-bold uppercase tracking-widest text-destructive/70">{problem}</div>
              <p className="text-sm text-muted-foreground leading-relaxed">{reality}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── HOW IT WORKS ─── */
function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 px-6">
      <div className="max-w-5xl mx-auto space-y-16">
        <div className="text-center space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-primary">The Platform</p>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
            How CloserLab works
          </h2>
        </div>

        <div className="space-y-6">
          {[
            {
              step: "01",
              icon: Users,
              title: "Build your buyer roster",
              body: "Create custom AI personas for every buyer type your team encounters. Set their industry, title, company size, personality, objections, and the product you're selling. Each persona is saved and shared across your team.",
            },
            {
              step: "02",
              icon: Mic,
              title: "Run live voice simulations",
              body: "Reps call the AI buyer and practice in real-time. The AI stays in character, pushes back, raises objections, and reacts to what's actually said – not a scripted response tree. Set the difficulty from warm to hostile.",
            },
            {
              step: "03",
              icon: BarChart3,
              title: "Review performance data",
              body: "Every call is automatically scored across confidence, objection handling, clarity, and closing. Managers see individual rep breakdowns and team-wide trends. No more guessing who needs coaching and what to work on.",
            },
          ].map(({ step, icon: Icon, title, body }) => (
            <div key={step} className="flex gap-6 rounded-xl border border-border bg-card p-6 sm:p-8">
              <div className="flex-shrink-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl gradient-primary">
                  <Icon className="h-5 w-5 text-primary-foreground" />
                </div>
              </div>
              <div className="space-y-2 min-w-0">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-bold text-primary/60">{step}</span>
                  <h3 className="text-lg font-black text-foreground">{title}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── FOR TEAMS ─── */
function ForTeams() {
  return (
    <section className="py-24 px-6 bg-card/20">
      <div className="max-w-5xl mx-auto space-y-16">
        <div className="text-center space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-primary">For Sales Leaders</p>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
            Replace unplanned role-play with<br />a repeatable training system.
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {[
            {
              icon: Target,
              title: "Custom personas per product & market",
              body: "Build once, use for every rep. Your personas reflect your real ICP – not generic buyer archetypes that don't match your deals.",
            },
            {
              icon: Users,
              title: "Team-wide access & shared roster",
              body: "Every persona you create is available to your whole team. New reps onboard to the same scenarios veterans train on.",
            },
            {
              icon: BarChart3,
              title: "Individual performance tracking",
              body: "See which reps are improving, which skills are lagging, and where the team average sits – across every call, every week.",
            },
            {
              icon: TrendingUp,
              title: "Objective scoring, not gut feel",
              body: "AI scores every call on confidence, objection handling, clarity, and closing. Coaching conversations become data-driven, not subjective.",
            },
            {
              icon: Phone,
              title: "Unlimited practice volume",
              body: "Reps practice when they want, as often as they want. No scheduling, no manager bottleneck, no waiting for a slot.",
            },
            {
              icon: Shield,
              title: "Interview prep included",
              body: "New hires and SDR candidates can practice with AI hiring managers before the real thing. Filter for readiness before you waste cycles.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex gap-4 rounded-xl border border-border bg-card p-5">
              <div className="flex-shrink-0 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-foreground">{title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── FOR INDIVIDUALS ─── */
function ForIndividuals() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-8 sm:p-12 space-y-8">
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-primary">For Individual Reps</p>
            <h2 className="text-3xl font-black tracking-tight text-foreground">
              Training on your own time.
            </h2>
            <p className="text-muted-foreground leading-relaxed max-w-xl">
              No team yet? Build your own roster of buyers, practice your cold calls and discovery conversations,
              and come into every call more prepared than your competition.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            {[
              "Build custom AI buyers for your industry",
              "Practice cold calls and discovery calls",
              "Get scored after every session",
              "Interview prep with AI hiring managers",
              "Track your improvement over time",
              "Start free – no credit card needed",
            ].map((f) => (
              <div key={f} className="flex items-start gap-2 text-sm text-foreground">
                <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                {f}
              </div>
            ))}
          </div>

          <Link
            to="/auth"
            className="inline-flex items-center gap-2 rounded-lg gradient-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Start Free <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ─── PRICING ─── */
function Pricing() {
  const plans = [
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
      trial: "1-day free trial",
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

  return (
    <section id="pricing" className="py-24 px-6 bg-card/20">
      <div className="max-w-5xl mx-auto space-y-12">
        <div className="text-center space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-primary">Pricing</p>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
            Simple, transparent pricing.
          </h2>
          <p className="text-muted-foreground">No contracts. Cancel anytime.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-xl border p-8 space-y-6 flex flex-col ${
                plan.highlighted
                  ? "border-primary bg-primary/5 shadow-[0_0_0_1px_hsl(82_100%_57%/0.1),0_0_40px_hsl(82_100%_57%/0.06)]"
                  : "border-border bg-card"
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full gradient-primary px-3 py-1 text-[10px] font-black text-primary-foreground uppercase tracking-wider whitespace-nowrap">
                  Most Popular
                </div>
              )}
              <div className="space-y-1">
                <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">{plan.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-foreground">
                    {plan.monthlyPrice}
                  </span>
                  {plan.period && <span className="text-sm text-muted-foreground">{plan.period}</span>}
                </div>
                <p className="text-xs text-muted-foreground">{plan.description}</p>
              </div>

              <ul className="space-y-2 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                    <Check className={`h-4 w-4 flex-shrink-0 mt-0.5 ${plan.highlighted ? "text-primary" : "text-muted-foreground"}`} />
                    {f}
                  </li>
                ))}
              </ul>

              {plan.id === "enterprise" ? (
                <a
                  href="mailto:niilastyni@gmail.com"
                  className="block w-full rounded-lg py-3 text-center text-sm font-bold transition-all border border-border bg-secondary text-foreground hover:border-primary/30 hover:bg-primary/5"
                >
                  Contact Sales
                </a>
              ) : (
                <Link
                  to="/auth"
                  className="block w-full rounded-lg py-3 text-center text-sm font-bold transition-all gradient-primary text-primary-foreground hover:opacity-90"
                >
                  Start Free Trial
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── FINAL CTA ─── */
function FinalCTA() {
  return (
    <section className="py-24 px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-background" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] rounded-full bg-primary/5 blur-[120px]" />

      <div className="relative z-10 max-w-3xl mx-auto text-center space-y-8">
        <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-foreground">
          Stop losing deals<br />
          <span className="text-primary">to poor preparation.</span>
        </h2>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
          Give your team a structured way to practice, improve, and be accountable.
          Set up your first persona in under two minutes.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/auth"
            className="group inline-flex items-center gap-2 rounded-lg gradient-primary px-8 py-4 text-sm font-bold uppercase tracking-wider text-primary-foreground transition-all hover:opacity-90"
          >
            Get Started Free
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            View pricing →
          </a>
        </div>
        <p className="text-xs text-muted-foreground/60">No credit card required</p>
      </div>
    </section>
  );
}

/* ─── FOOTER ─── */
function Footer() {
  return (
    <footer className="border-t border-border py-12 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-8">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded gradient-primary">
                <Zap className="h-3 w-3 text-primary-foreground" />
              </div>
              <span className="text-sm font-black tracking-tight text-foreground">
                CLOSER<span className="text-primary">LAB</span>
              </span>
            </div>
            <p className="text-xs text-muted-foreground max-w-[200px] leading-relaxed">
              AI-powered sales training for modern sales teams.
            </p>
          </div>

          <div className="flex flex-wrap gap-x-12 gap-y-6 text-sm">
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Product</p>
              <div className="space-y-1.5 flex flex-col">
                <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors text-sm">How It Works</a>
                <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors text-sm">Pricing</a>
                <Link to="/auth" className="text-muted-foreground hover:text-foreground transition-colors text-sm">Sign Up</Link>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Legal</p>
              <div className="space-y-1.5 flex flex-col">
                <Link to="/privacy" className="text-muted-foreground hover:text-foreground transition-colors text-sm">Privacy Policy</Link>
                <Link to="/terms" className="text-muted-foreground hover:text-foreground transition-colors text-sm">Terms of Service</Link>
                <Link to="/dpa" className="text-muted-foreground hover:text-foreground transition-colors text-sm">DPA</Link>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Contact</p>
              <div className="space-y-1.5 flex flex-col">
                <a href="mailto:support@closerlab.net" className="text-muted-foreground hover:text-foreground transition-colors text-sm">support@closerlab.net</a>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-8 mt-8 border-t border-border">
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} CloserLab. All rights reserved.</p>
          <div className="flex items-center gap-4 text-xs">
            <Link to="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">Privacy</Link>
            <Link to="/terms" className="text-muted-foreground hover:text-foreground transition-colors">Terms</Link>
            <Link to="/dpa" className="text-muted-foreground hover:text-foreground transition-colors">DPA</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ─── PAGE ─── */
export default function Landing() {
  return (
    <div className="bg-background text-foreground scroll-smooth">
      <Nav />
      <main className="pt-14">
        <Hero />
        <Problem />
        <HowItWorks />
        <ForTeams />
        <ForIndividuals />
        <Pricing />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}