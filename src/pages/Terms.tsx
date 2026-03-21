import { Link } from "react-router-dom";
import { FileText } from "lucide-react";
import { ArrowLeft } from "lucide-react";

const SECTIONS = [
  {
    id: "agreement",
    title: "1. Agreement to Terms",
    content: [
      "These Terms of Service ('Terms') form a legally binding agreement between you ('User') and CloserLab ('we', 'us') governing your access to and use of support@closerlab.com (the 'Service'). By creating an account or using the Service, you accept these Terms in full.",
    ],
  },
  {
    id: "service",
    title: "2. Description of Service",
    content: ["CloserLab is an AI-powered sales training platform. The Service includes:"],
    items: [
      "Text-based simulation sessions against AI buyer personas",
      "Real-time AI voice call simulations (Pro plan only)",
      "Call scoring, feedback, and coaching tips",
      "Challenge drills and daily objection practice",
      "XP-based rank progression and leaderboards",
    ],
  },
  {
    id: "accounts",
    title: "3. Account Registration",
    content: ["To access the Service you must register with a valid email. You agree to:"],
    items: [
      "Provide accurate and complete registration information",
      "Keep your password confidential and not share it with others",
      "Notify us immediately of any unauthorised access to your account",
      "Be responsible for all activity that occurs under your account",
    ],
    note: "You must be at least 16 years old to use the Service.",
  },
  {
    id: "billing",
    title: "4. Subscription Plans & Billing",
    subsections: [
      {
        title: "Plans",
        items: [
          "Free — 3 simulation sessions total, text-only",
          "Starter — Unlimited text simulations, all personas, full scoring",
          "Pro — Everything in Starter plus real-time AI voice calls (45 min/day)",
        ],
      },
      {
        title: "Billing & Cancellation",
        items: [
          "Subscriptions are billed in advance monthly or annually via Stripe",
          "All fees are in EUR and are non-refundable except where required by law",
          "You may cancel at any time — cancellation takes effect at the end of the billing period",
          "No partial refunds are issued for unused time within a billing period",
        ],
      },
      {
        title: "Free Trial",
        items: [
          "Where a trial is offered, you must provide payment details to start",
          "If you do not cancel before the trial ends, you will be charged the subscription fee",
        ],
      },
    ],
  },
  {
    id: "use",
    title: "5. Acceptable Use",
    content: ["You agree not to:"],
    items: [
      "Attempt to reverse-engineer, scrape, or extract proprietary AI models or prompts",
      "Use automation tools or bots to access the Service in unpermitted ways",
      "Share your account credentials or resell access to others",
      "Attempt to manipulate scoring, XP, or leaderboard rankings fraudulently",
      "Use the Service to generate or distribute illegal content",
      "Violate any applicable law or third-party rights",
    ],
    note: "We reserve the right to suspend or terminate accounts that violate these rules.",
  },
  {
    id: "ai",
    title: "6. AI-Generated Content",
    content: ["The Service uses OpenAI to generate simulated buyer responses, scoring, and coaching. You acknowledge that:"],
    items: [
      "AI outputs are for training purposes only — not professional sales advice",
      "AI-generated feedback may occasionally be inaccurate or incomplete",
      "You are responsible for how you apply any coaching suggestions in the real world",
      "CloserLab does not guarantee specific skill outcomes or sales performance improvements",
    ],
  },
  {
    id: "ip",
    title: "7. Intellectual Property",
    content: [
      "All content, software, AI prompts, scoring systems, visual design, and the CloserLab name are owned by or licensed to CloserLab. You may not copy, reproduce, or distribute them without written permission.",
      "You retain ownership of content you submit. By submitting, you grant us a limited licence to process and store that content to provide the Service. We do not use your content to train third-party AI models.",
    ],
  },
  {
    id: "liability",
    title: "8. Disclaimers & Liability",
    content: [
      "THE SERVICE IS PROVIDED \"AS IS\" WITHOUT WARRANTIES OF ANY KIND. We do not warrant that the Service will be error-free or uninterrupted.",
      "TO THE MAXIMUM EXTENT PERMITTED BY LAW, CLOSERLAB SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, OR CONSEQUENTIAL DAMAGES. Our total aggregate liability shall not exceed the amount you paid to CloserLab in the 12 months preceding the claim, or EUR 100, whichever is greater.",
    ],
  },
  {
    id: "termination",
    title: "9. Termination",
    content: [
      "We may suspend or terminate your account at any time for violations of these Terms. Upon termination, your right to access the Service ceases immediately. You may delete your account at any time via Account settings.",
    ],
  },
  {
    id: "contact",
    title: "10. Governing Law & Contact",
    content: [
      "These Terms are governed by the laws of the European Union and the jurisdiction in which CloserLab operates.",
      "Questions? Contact us at support@closerlab.com",
      "Last updated: March 21, 2026",
    ],
  },
];

export default function Terms() {
  return (
    <div className="min-h-screen bg-background pt-14">
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
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-primary">Legal</span>
          </div>
          <h1 className="text-4xl font-black text-foreground tracking-tight">Terms of Service</h1>
          <p className="mt-2 text-sm text-muted-foreground">Effective March 21, 2026</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-12 space-y-10">
        {SECTIONS.map((section) => (
          <section key={section.id} id={section.id} className="scroll-mt-20">
            <h2 className="text-lg font-bold text-foreground mb-4 pb-2 border-b border-border">
              {section.title}
            </h2>

            {section.content?.map((text, i) => (
              <p key={i} className="text-sm text-muted-foreground leading-relaxed mb-3">{text}</p>
            ))}

            {(section as any).subsections?.map((sub: any) => (
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

            {(section as any).items && (
              <ul className="space-y-1.5 mb-3">
                {(section as any).items.map((item: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-primary flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            )}

            {(section as any).note && (
              <div className="mt-3 rounded-md border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground font-medium">
                {(section as any).note}
              </div>
            )}
          </section>
        ))}
      </div>

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