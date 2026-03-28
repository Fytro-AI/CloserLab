import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Lock, Zap, AlertCircle, ArrowRight, X, Mic, Crown, Swords, Monitor, Target, BookOpen, Briefcase } from "lucide-react";
import { INDUSTRIES, DIFFICULTIES, PERSONAS } from "@/lib/game-data";
import { useIsMobile } from "@/hooks/use-mobile";
import { useProfile } from "@/hooks/useProfile";

const FIRST_NAMES = ["Jordan", "Alex", "Morgan", "Taylor", "Riley", "Casey", "Quinn", "Drew", "Avery", "Blake"];
const LAST_NAMES = ["Reeves", "Chen", "Nakamura", "Okafor", "Lindström", "Patel", "Torres", "Andersson", "Kim", "Dubois"];

const COMPANY_TEMPLATES: Record<string, string[]> = {
  saas: ["{last} Systems", "{last} Cloud", "NovaTech Solutions", "{first}Ware"],
  "macro-intelligence": ["{last} Capital Research", "Meridian Analytics", "{last} Macro Group", "AlphaSignal"],
  "real-estate": ["{last} Realty Group", "Apex Properties", "{last} Investments", "PrimePoint Real Estate"],
  recruiting: ["{last} Talent Partners", "SwiftHire", "{first} Staffing Co.", "{last} Search Group"],
  consulting: ["{last} Advisory", "{first} & Partners Consulting", "Strategos Group", "{last} Insights"],
  plumbing: ["{last} Home Services", "QuickFix Plumbing", "{last} & Sons", "PipePro Co."],
  coaching: ["{first}'s Coaching Program", "{last} Performance Lab", "Peak Mindset Co.", "{first} Academy"],
  ecommerce: ["{last} Commerce", "ShopVault", "{first} Brands", "CartEdge"],
  agency: ["{last} Media Group", "Spark Agency", "{first} & Partners", "GrowthForge"],
  healthcare: ["{last} Medical Group", "Apex Health", "{last} Clinics", "VitalCare Solutions"],
};

const BACKSTORIES: Record<string, string[]> = {
  skeptical: [
    "Has been burned by vendors before. Needs proof, not promises.",
    "Did extensive research before this call. Will challenge every claim.",
  ],
  aggressive: [
    "Known for cutting meetings short. Respects confidence, punishes weakness.",
    "Former sales rep turned buyer. Knows every trick in the book.",
  ],
  distracted: [
    "Triple-booked today. You have a narrow window to capture attention.",
    "Checking emails while you talk. Earn the focus or lose the deal.",
  ],
  budget: [
    "Just cut 20% of the department budget. Every dollar needs justification.",
    "Reports to a CFO who blocks anything without clear ROI.",
  ],
  "time-starved": [
    "Running between meetings. You have 5 minutes to make your case.",
    "Already late for the next call. Get to the point or get cut.",
  ],
};

const INTERVIEW_COMPANIES = [
  "Salesforce", "HubSpot", "Outreach", "Gong", "Apollo", "ZoomInfo",
  "Snowflake", "Datadog", "Okta", "Monday.com", "Asana", "Notion",
];

const INTERVIEW_ROLES = [
  { id: "sdr", label: "SDR", description: "Sales Development Rep" },
  { id: "bdr", label: "BDR", description: "Business Development Rep" },
  { id: "ae", label: "Account Executive", description: "Full cycle sales" },
  { id: "sdr-us", label: "SDR (US Market)", description: "Outbound, US territory" },
];

function generateProspect(persona: string, industry: string) {
  const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const last = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  const templates = COMPANY_TEMPLATES[industry] || COMPANY_TEMPLATES.saas;
  const companyTemplate = templates[Math.floor(Math.random() * templates.length)];
  const company = companyTemplate.replace("{first}", first).replace("{last}", last);
  const backstories = BACKSTORIES[persona] || BACKSTORIES.skeptical;
  const backstory = backstories[Math.floor(Math.random() * backstories.length)];
  return { firstName: first, lastName: last, company, backstory };
}

export default function Scenarios() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { profile, canStartSimulation, remainingSimulations } = useProfile();
  const [industry, setIndustry] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<string | null>(null);
  const [persona, setPersona] = useState<string | null>(null);
  const [showProspectCard, setShowProspectCard] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [customIndustry, setCustomIndustry] = useState("");
  const [simulationMode, setSimulationMode] = useState<"discovery" | "meeting-setter" | "interview">("discovery");
  const [interviewRole, setInterviewRole] = useState("SDR");
  const [interviewCompany, setInterviewCompany] = useState("");

  const userXp = profile?.xp ?? 0;
  const isInterviewMode = simulationMode === "interview";

  const canStart = isInterviewMode
    ? !!difficulty
    : (industry || customIndustry.trim()) && difficulty && persona;

  const canSimulate = canStartSimulation();
  const remaining = remainingSimulations();

  const prospect = useMemo(() => {
    if (!showProspectCard || !persona || isInterviewMode) return null;
    return generateProspect(persona, industry || "saas");
  }, [showProspectCard, persona, industry, isInterviewMode]);

  const personaData = persona ? PERSONAS.find((p) => p.id === persona) : null;

  const handleArenaClick = () => {
    if (!canStart || !canSimulate) return;
    if (isInterviewMode) {
      navigate("/simulation", {
        state: {
          industry: "saas",
          difficulty,
          persona: "skeptical",
          voiceMode,
          simulationMode: "interview",
          interviewRole,
          interviewCompany: interviewCompany.trim() || INTERVIEW_COMPANIES[Math.floor(Math.random() * INTERVIEW_COMPANIES.length)],
        },
      });
    } else {
      setShowProspectCard(true);
    }
  };

  const handleEnterCall = () => {
    navigate("/simulation", {
      state: {
        industry,
        difficulty,
        persona,
        voiceMode,
        simulationMode,
        prospectName: prospect ? `${prospect.firstName} ${prospect.lastName}` : undefined,
        prospectCompany: prospect?.company,
        prospectBackstory: prospect?.backstory,
        customIndustryDescription: customIndustry.trim() || undefined,
      },
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8 animate-slide-up">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">Choose Your Battle</h1>
          <p className="text-muted-foreground">Configure your scenario. The harder the fight, the more XP you earn.</p>
        </div>
        <Link
          to="/challenges"
          className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2 text-sm font-bold text-primary hover:bg-primary/10 transition-colors"
        >
          <Swords className="h-4 w-4" /> Drills
        </Link>
      </div>

      {!profile?.is_pro && (
        <div className="flex items-center gap-3 rounded-lg border border-accent/30 bg-accent/5 p-4">
          <AlertCircle className="h-5 w-5 text-accent flex-shrink-0" />
          <div className="text-sm">
            <span className="font-semibold text-foreground">Free tier: </span>
            <span className="text-muted-foreground">
              {remaining === 0
                ? "No simulations left this week. Upgrade to Pro for unlimited training."
                : `${remaining} simulation${remaining === 1 ? "" : "s"} remaining this week.`}
            </span>
          </div>
        </div>
      )}

      {/* SIMULATION MODE */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Training Mode</h2>
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => setSimulationMode("discovery")}
            className={`rounded-lg border p-4 text-left transition-all card-glow-hover ${simulationMode === "discovery" ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/30"}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="h-4 w-4 text-primary" />
              <div className="font-semibold text-foreground text-sm">Discovery Call</div>
            </div>
            <div className="text-xs text-muted-foreground leading-relaxed">Full conversation. Uncover pain, handle objections, build value.</div>
          </button>

          <button
            onClick={() => setSimulationMode("meeting-setter")}
            className={`rounded-lg border p-4 text-left transition-all card-glow-hover ${simulationMode === "meeting-setter" ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/30"}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-4 w-4 text-primary" />
              <div className="font-semibold text-foreground text-sm">Meeting Setter</div>
            </div>
            <div className="text-xs text-muted-foreground leading-relaxed">Busy prospect. One goal: book the next step.</div>
          </button>

          <button
            onClick={() => setSimulationMode("interview")}
            className={`rounded-lg border p-4 text-left transition-all card-glow-hover relative ${simulationMode === "interview" ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/30"}`}
          >
            <div className="absolute top-2 right-2 rounded-full bg-accent/10 border border-accent/20 px-2 py-0.5 text-[10px] font-bold text-accent uppercase tracking-wider">New</div>
            <div className="flex items-center gap-2 mb-1">
              <Briefcase className="h-4 w-4 text-primary" />
              <div className="font-semibold text-foreground text-sm">Interview Prep</div>
            </div>
            <div className="text-xs text-muted-foreground leading-relaxed">AI hiring manager. Practice before the real thing.</div>
          </button>
        </div>

        {simulationMode === "meeting-setter" && (
          <div className="rounded-lg border border-primary/15 bg-primary/5 px-4 py-3 text-xs text-muted-foreground leading-relaxed">
            <span className="text-primary font-semibold">Meeting Setter mode: </span>
            The prospect picks up cold. Your only goal is to earn a follow-up meeting. Scored on Speed to Value, Clarity of Ask, and Booking Attempt.
          </div>
        )}
        {simulationMode === "interview" && (
          <div className="rounded-lg border border-primary/15 bg-primary/5 px-4 py-3 text-xs text-muted-foreground leading-relaxed">
            <span className="text-primary font-semibold">Interview Prep mode: </span>
            AI plays a hiring manager conducting a real SDR/BDR interview. Scored on Communication, Sales Knowledge, Confidence, and Self-Awareness.
          </div>
        )}
      </div>

      {/* INTERVIEW OPTIONS */}
      {isInterviewMode && (
        <>
          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Role</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {INTERVIEW_ROLES.map((role) => (
                <button
                  key={role.id}
                  onClick={() => setInterviewRole(role.label)}
                  className={`rounded-lg border p-3 text-left transition-all card-glow-hover ${interviewRole === role.label ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/30"}`}
                >
                  <div className="font-semibold text-foreground text-xs">{role.label}</div>
                  <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">{role.description}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Company <span className="text-xs font-normal normal-case text-muted-foreground/60">(optional - leave blank for random)</span>
            </h2>
            <input
              value={interviewCompany}
              onChange={(e) => setInterviewCompany(e.target.value)}
              placeholder="e.g. Salesforce, HubSpot, Outreach..."
              className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              maxLength={200}
            />
          </div>
        </>
      )}

      {/* INDUSTRY (hidden for interview) */}
      {!isInterviewMode && (
        <>
          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Industry</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {INDUSTRIES.map((ind) => (
                <button
                  key={ind.id}
                  onClick={() => setIndustry(ind.id)}
                  className={`rounded-lg border p-3 text-left transition-all card-glow-hover ${industry === ind.id ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/30"}`}
                >
                  <div className="text-xl mb-1">{ind.icon}</div>
                  <div className="font-semibold text-foreground text-xs">{ind.label}</div>
                  <div className="text-[10px] text-muted-foreground leading-tight">{ind.description}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Custom Buyer Profile <span className="text-xs font-normal normal-case text-muted-foreground/60">(optional)</span>
            </h2>
            <textarea
              value={customIndustry}
              onChange={(e) => setCustomIndustry(e.target.value)}
              placeholder="Describe your industry and typical buyer..."
              className="w-full rounded-lg border border-border bg-card p-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              rows={2}
              maxLength={1000}
            />
          </div>
        </>
      )}

      {/* DIFFICULTY */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Difficulty</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {DIFFICULTIES.map((diff) => {
            if (isInterviewMode && diff.id === "nightmare") return null;
            const locked = !isInterviewMode && userXp < diff.minXP;
            return (
              <button
                key={diff.id}
                onClick={() => !locked && setDifficulty(diff.id)}
                disabled={locked}
                className={`rounded-lg border p-4 text-left transition-all relative ${
                  locked ? "border-border bg-card opacity-50 cursor-not-allowed"
                    : difficulty === diff.id ? "border-primary bg-primary/10 card-glow"
                    : "border-border bg-card hover:border-primary/30 card-glow-hover"
                }`}
              >
                {locked && <div className="absolute top-2 right-2"><Lock className="h-4 w-4 text-muted-foreground" /></div>}
                <div className={`font-bold text-lg ${diff.color}`}>{diff.label}</div>
                <div className="text-xs text-muted-foreground">
                  {locked ? `Unlock at ${diff.minXP} XP`
                    : isInterviewMode ? (diff.id === "easy" ? "Friendly panel" : diff.id === "medium" ? "Standard interview" : "Tough interviewer")
                    : `${diff.xpMultiplier}x XP`}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* PERSONA (hidden for interview) */}
      {!isInterviewMode && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Buyer Persona</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {PERSONAS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPersona(p.id)}
                className={`rounded-lg border p-4 text-left transition-all card-glow-hover ${persona === p.id ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/30"}`}
              >
                <div className="text-2xl mb-2">{p.icon}</div>
                <div className="font-semibold text-foreground text-sm">{p.label}</div>
                <div className="text-xs text-muted-foreground">{p.description}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* CALL MODE - shown for ALL simulation modes */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Call Mode</h2>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setVoiceMode(false)}
            className={`rounded-lg border p-4 text-left transition-all card-glow-hover ${!voiceMode ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/30"}`}
          >
            <div className="font-semibold text-foreground text-sm">💬 Text Chat</div>
            <div className="text-xs text-muted-foreground">
              {isInterviewMode ? "Type your answers" : "Type your pitch"}
            </div>
          </button>
          <button
            onClick={() => profile?.is_pro && setVoiceMode(true)}
            disabled={!profile?.is_pro}
            className={`rounded-lg border p-4 text-left transition-all relative ${
              !profile?.is_pro
                ? "border-border bg-card opacity-50 cursor-not-allowed"
                : voiceMode
                ? "border-primary bg-primary/10 card-glow"
                : "border-border bg-card hover:border-primary/30 card-glow-hover"
            }`}
          >
            {!profile?.is_pro && (
              <div className="absolute top-2 right-2 flex items-center gap-1">
                <Crown className="h-4 w-4 text-accent" />
                {isMobile && <Monitor className="h-4 w-4 text-muted-foreground" />}
              </div>
            )}
            <div className="font-semibold text-foreground text-sm flex items-center gap-1.5">
              <Mic className="h-4 w-4" /> Voice Call
            </div>
            <div className="text-xs text-muted-foreground">
              {profile?.is_pro
                ? isInterviewMode ? "Speak your answers aloud" : "Speak your pitch aloud"
                : "Pro feature - upgrade to unlock"}
            </div>
          </button>
        </div>
      </div>

      {/* START */}
      <button
        onClick={handleArenaClick}
        disabled={!canStart || !canSimulate}
        className={`w-full rounded-lg py-4 text-lg font-black uppercase tracking-wider transition-all ${
          canStart && canSimulate
            ? "gradient-primary text-primary-foreground hover:opacity-90 card-glow"
            : "bg-secondary text-muted-foreground cursor-not-allowed"
        }`}
      >
        <span className="flex items-center justify-center gap-2">
          <Zap className="h-5 w-5" />
          {!canSimulate
            ? "No simulations left - Go Pro"
            : canStart
            ? isInterviewMode
              ? "Start Interview"
              : simulationMode === "meeting-setter"
              ? "Enter the Arena - Book the Meeting"
              : "Enter the Arena"
            : isInterviewMode
            ? "Select difficulty to begin"
            : "Select all options to begin"}
        </span>
      </button>

      {/* PROSPECT CARD MODAL */}
      {showProspectCard && prospect && personaData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md mx-4 rounded-xl border border-primary/30 bg-card p-8 space-y-6 card-glow">
            <button onClick={() => setShowProspectCard(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-5 w-5" />
            </button>
            <div className="text-center space-y-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                {simulationMode === "meeting-setter" ? "Cold Call - Book the Meeting" : "Incoming Call"}
              </p>
              <div className="text-5xl mt-3 mb-2">{personaData.icon}</div>
              <h2 className="text-2xl font-black text-foreground">{prospect.firstName} {prospect.lastName}</h2>
              <p className="text-sm text-muted-foreground font-medium">{prospect.company}</p>
            </div>
            {simulationMode === "meeting-setter" && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-center">
                <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1">Your Mission</p>
                <p className="text-sm text-foreground">Get off this call with a booked meeting. You have 60 seconds.</p>
              </div>
            )}
            <div className="rounded-lg border border-border bg-secondary/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Intel</p>
              <p className="text-sm text-foreground leading-relaxed">{prospect.backstory}</p>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="uppercase font-semibold">{personaData.label}</span>
              <span>•</span>
              <span className="uppercase font-semibold">{INDUSTRIES.find((i) => i.id === industry)?.label}</span>
              <span>•</span>
              <span className={`uppercase font-bold ${DIFFICULTIES.find((d) => d.id === difficulty)?.color}`}>
                {DIFFICULTIES.find((d) => d.id === difficulty)?.label}
              </span>
            </div>
            <button
              onClick={handleEnterCall}
              className="w-full rounded-lg gradient-primary py-4 text-base font-black uppercase tracking-wider text-primary-foreground hover:opacity-90 transition-all flex items-center justify-center gap-2"
            >
              <Zap className="h-5 w-5" />
              {simulationMode === "meeting-setter" ? "Start Cold Call" : "Start Call"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}