import { Link } from "react-router-dom";
import { Shield, ArrowLeft, ChevronRight } from "lucide-react";

const SECTIONS = [
  {
    id: "intro",
    title: "1. Introduction",
    content: [
      "CloserLab 'we', 'our', or 'us' is committed to protecting your personal data. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our AI sales training platform at closerlab.net (the 'Service').",
      "By using CloserLab, you agree to the practices described in this policy.",
    ],
  },
  {
    id: "collect",
    title: "2. Information We Collect",
    subsections: [
      {
        title: "Account Information",
        items: [
          "Name and email address",
          "Password (stored as a one-way hash - we never see your plaintext password)",
          "Account creation timestamp and authentication metadata",
        ],
      },
      {
        title: "Usage Data",
        items: [
          "Training session data: industry, difficulty, persona, simulation mode, duration",
          "Performance scores: objection handling, confidence, clarity, closing scores, XP earned",
          "Call transcripts from text-based simulations",
          "Challenge completions, daily objection responses, and AI feedback",
          "Streak data and activity timestamps",
        ],
      },
      {
        title: "Voice Call Data (Pro)",
        items: [
          "Audio is processed in real-time via OpenAI's Realtime API and is not stored by CloserLab",
          "Voice transcripts generated during the session are stored in your account history",
          "Voice usage minutes are tracked to enforce plan limits",
        ],
      },
      {
        title: "Payment Information",
        items: [
          "We use Stripe as our payment processor. We do not store credit card numbers. Stripe's privacy policy governs payment data.",
        ],
      },
    ],
  },
  {
    id: "use",
    title: "3. How We Use Your Data",
    items: [
      "Provide and operate the CloserLab platform",
      "Generate AI coaching feedback and performance scores",
      "Track your XP, rank, skill progression, and leaderboard placement",
      "Process payments and manage your subscription via Stripe",
      "Send transactional emails (e.g., account confirmation, billing receipts)",
      "Detect fraud, abuse, and enforce our Terms of Service",
      "Improve the platform through aggregate, anonymised usage analytics",
      "Comply with legal obligations",
    ],
    note: "We do not use your data to train third-party AI models or sell it to advertisers.",
  },
  {
    id: "sharing",
    title: "4. Data Sharing",
    content: ["We share your data only with the following service providers:"],
    items: [
      "Supabase - database and authentication hosting",
      "OpenAI - AI simulation engine, scoring, and voice processing",
      "Stripe - subscription billing and payment processing",
      "Vercel - frontend hosting and CDN",
      "Legal authorities - if required by law or court order",
    ],
    note: "We do not sell personal data to third parties.",
  },
  {
    id: "retention",
    title: "5. Data Retention",
    content: [
      "We retain your data for as long as your account is active. If you delete your account, we will delete your personal data within 30 days, except where retention is required by law (e.g., billing records for tax compliance, retained for up to 7 years).",
    ],
  },
  {
    id: "rights",
    title: "6. Your Rights",
    content: ["Depending on your location, you may have the right to:"],
    items: [
      "Access - request a copy of the data we hold about you",
      "Rectification - correct inaccurate or incomplete data",
      "Erasure - request deletion of your data (\"right to be forgotten\")",
      "Restriction - ask us to stop processing in certain circumstances",
      "Portability - receive your data in a machine-readable format",
      "Objection - object to processing based on legitimate interests",
    ],
    note: "To exercise your rights, email support@closerlab.com. We respond within 30 days.",
  },
  {
    id: "security",
    title: "7. Security",
    content: [
      "We implement industry-standard security including TLS encryption in transit, hashed passwords, row-level security on our database, and restricted API key access. No system is 100% secure - please use a strong, unique password and notify us immediately at support@closerlab.com if you suspect unauthorised access.",
    ],
  },
  {
    id: "contact",
    title: "8. Contact",
    content: [
      "For privacy questions or to exercise your rights, contact us at support@closerlab.com.",
      "Last updated: March 21, 2026",
    ],
  },
];

export default function Privacy() {
  return (
    <LegalPage title="Privacy Policy" icon={<Shield className="h-5 w-5 text-primary" />} sections={SECTIONS} />
  );
}

// ─── Reusable legal page shell ────────────────────────────────────────────
function LegalPage({ title, icon, sections }: { title: string; icon: React.ReactNode; sections: any[] }) {
  return (
    <div className="min-h-screen bg-background pt-14">
      {/* Hero strip */}
      <div className="border-b border-border bg-card/40">
        <div className="max-w-3xl mx-auto px-6 py-12">
          <Link
            to="/landing"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </Link>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
              {icon}
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-primary">Legal</span>
          </div>
          <h1 className="text-4xl font-black text-foreground tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">Effective March 21, 2026</p>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-3xl mx-auto px-6 py-12 space-y-10">
        {sections.map((section) => (
          <section key={section.id} id={section.id} className="scroll-mt-20">
            <h2 className="text-lg font-bold text-foreground mb-4 pb-2 border-b border-border">
              {section.title}
            </h2>

            {section.content?.map((text: string, i: number) => (
              <p key={i} className="text-sm text-muted-foreground leading-relaxed mb-3">{text}</p>
            ))}

            {section.subsections?.map((sub: any) => (
              <div key={sub.title} className="mb-5">
                <h3 className="text-sm font-semibold text-foreground mb-2">{sub.title}</h3>
                <ul className="space-y-1.5">
                  {sub.items.map((item: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="mt-1.5 h-1 w-1 rounded-full bg-primary flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {section.items && (
              <ul className="space-y-1.5 mb-3">
                {section.items.map((item: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-primary flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            )}

            {section.note && (
              <div className="mt-3 rounded-md border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground font-medium">
                {section.note}
              </div>
            )}
          </section>
        ))}
      </div>

      {/* Bottom nav */}
      <div className="border-t border-border bg-card/30">
        <div className="max-w-3xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} CloserLab. All rights reserved.</p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link to="/dpa" className="hover:text-foreground transition-colors">DPA</Link>
          </div>
        </div>
      </div>
    </div>
  );
}