import { Link } from "react-router-dom";
import { Lock, ArrowLeft } from "lucide-react";

const SECTIONS = [
  {
    id: "intro",
    title: "Introduction",
    content: [
      "This Data Processing Agreement ('DPA') forms part of the Terms of Service between CloserLab ('Processor') and the User ('Controller'). It governs the processing of personal data as required by Article 28 of the GDPR (EU) 2016/679.",
      "This DPA applies where CloserLab processes personal data on behalf of business users who are themselves controllers of personal data under GDPR.",
    ],
  },
  {
    id: "roles",
    title: "1. Roles & Responsibilities",
    content: ["The parties acknowledge that:"],
    items: [
      "The User (Controller) determines the purposes and means of processing personal data of their team members or end users",
      "CloserLab (Processor) processes personal data solely on the Controller's documented instructions and for the purpose of providing the Services",
    ],
  },
  {
    id: "scope",
    title: "2. Scope of Processing",
    subsections: [
      {
        title: "Categories of Personal Data",
        items: [
          "Identity data: name, email address",
          "Usage data: simulation sessions, performance scores, XP, activity timestamps",
          "Communication data: text transcripts from training sessions",
          "Technical data: IP address, browser, device identifiers",
        ],
      },
      {
        title: "Categories of Data Subjects",
        items: [
          "The Controller's employees, contractors, or other end users accessing the Service under the Controller's account",
        ],
      },
    ],
  },
  {
    id: "obligations",
    title: "3. Processor Obligations",
    content: ["CloserLab agrees to:"],
    items: [
      "Process personal data only on documented instructions from the Controller",
      "Ensure authorised personnel are bound by confidentiality obligations",
      "Implement appropriate technical and organisational measures per Article 32 GDPR",
      "Not engage sub-processors without prior authorisation (see Section 4)",
      "Assist the Controller in fulfilling Data Subject rights obligations",
      "Notify the Controller of personal data breaches within 72 hours",
      "Delete or return all personal data upon termination of Services",
      "Make available all information necessary to demonstrate compliance",
    ],
  },
  {
    id: "subprocessors",
    title: "4. Sub-processors",
    content: [
      "The Controller grants general authorisation for CloserLab to engage the following sub-processors. CloserLab will provide 30 days' notice before adding a new sub-processor.",
    ],
    subprocessors: [
      { name: "Supabase, Inc.", purpose: "Database hosting and authentication", region: "EU / US" },
      { name: "OpenAI, LLC", purpose: "AI simulation, scoring, voice processing", region: "US" },
      { name: "Stripe, Inc.", purpose: "Payment processing", region: "US" },
      { name: "Vercel, Inc.", purpose: "Frontend hosting and CDN", region: "US" },
    ],
  },
  {
    id: "security",
    title: "5. Security Measures",
    content: ["CloserLab implements the following technical and organisational security measures:"],
    items: [
      "TLS 1.2+ encryption in transit for all data communications",
      "Passwords stored as salted cryptographic hashes (never plaintext)",
      "Row-level security (RLS) on all database tables to enforce per-user data isolation",
      "API key rotation and restricted access controls",
      "Access to production systems limited to authorised personnel only",
    ],
  },
  {
    id: "breach",
    title: "6. Data Breach Notification",
    content: ["In the event of a personal data breach, CloserLab will:"],
    items: [
      "Notify the Controller without undue delay and within 72 hours of becoming aware",
      "Provide sufficient information to allow the Controller to meet its own notification obligations",
      "Cooperate in investigating, mitigating, and remediating the breach",
    ],
  },
  {
    id: "transfers",
    title: "7. International Transfers",
    content: [
      "Personal data may be transferred to and processed in the United States by sub-processors (OpenAI, Stripe, Vercel). CloserLab ensures such transfers are subject to appropriate safeguards including Standard Contractual Clauses (SCCs) approved by the European Commission.",
    ],
  },
  {
    id: "retention",
    title: "8. Retention & Deletion",
    content: [
      "Upon termination or upon written request, CloserLab will delete all personal data within 30 days and provide written confirmation. Financial records may be retained for up to 7 years for tax compliance. Anonymised aggregate analytics data may be retained indefinitely.",
    ],
  },
  {
    id: "contact",
    title: "9. Contact",
    content: [
      "For DPA-related enquiries, email support@closerlab.com with subject line: \"DPA Request - [your company name]\".",
      "We aim to respond to all formal DPA enquiries within 5 business days.",
      "Last updated: March 21, 2026",
    ],
  },
];

export default function DPA() {
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
              <Lock className="h-5 w-5 text-primary" />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-primary">Legal</span>
          </div>
          <h1 className="text-4xl font-black text-foreground tracking-tight">Data Processing Agreement</h1>
          <p className="mt-2 text-sm text-muted-foreground">GDPR Article 28 - Effective March 21, 2026</p>
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

            {/* Special sub-processor table */}
            {(section as any).subprocessors && (
              <div className="mt-3 overflow-hidden rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-secondary/50">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Processor</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Purpose</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Region</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(section as any).subprocessors.map((sp: any, i: number) => (
                      <tr key={i} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground">{sp.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{sp.purpose}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-xs font-mono text-primary">{sp.region}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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