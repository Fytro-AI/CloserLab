import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Phone, PhoneOff, Zap, Crown, ArrowRight,
  AlertTriangle, X, Building2, ChevronDown,
  Plus, Monitor, Users, Loader2,
  ChevronLeft, ChevronRight, Mic,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useCompanyProfiles, type CompanyProfile } from "@/hooks/useCompanyProfiles";

interface ScriptEntry {
  id: string;
  prospectSaid: string;
  script: string;
  timestamp: number;
  streaming: boolean;
}

interface TranscriptLine {
  speaker: "prospect" | "seller";
  text: string;
  timestamp: number;
}

type Phase = "setup" | "connecting" | "active" | "ended";

/* ─────────────────────────────────────────────────────────────
   STREAMING HOOK
───────────────────────────────────────────────────────────── */
function useStreamingScript() {
  const abortRef = useRef<AbortController | null>(null);

  const streamInto = useCallback(async (
    prospectSaid: string,
    sellerContext: string[],
    companyProfile: CompanyProfile | null,
    callGoal: string,
    prospectInfo: string,
    onToken: (token: string) => void,
    onDone: () => void,
  ) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { onDone(); return; }

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/live-call-coach`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          body: JSON.stringify({ prospectSaid, sellerContext, companyProfile, callGoal, prospectInfo }),
          signal: controller.signal,
        }
      );

      if (!resp.ok || !resp.body) { onDone(); return; }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6);
          if (payload === "[DONE]") { onDone(); return; }
          try { const { token: tok } = JSON.parse(payload); if (tok) onToken(tok); } catch {}
        }
      }
    } catch (e: any) {
      if (e.name !== "AbortError") console.error("Stream error:", e);
    }
    onDone();
  }, []);

  const cancel = useCallback(() => { abortRef.current?.abort(); }, []);
  return { streamInto, cancel };
}

/* ─────────────────────────────────────────────────────────────
   HOLD BUTTON
───────────────────────────────────────────────────────────── */
function HoldButton({ onRelease, disabled }: {
  onRelease: (text: string) => void;
  disabled: boolean;
}) {
  const [held, setHeld] = useState(false);
  const [duration, setDuration] = useState(0);
  const [interimPreview, setInterimPreview] = useState("");

  const recogRef = useRef<any>(null);
  const accumulatedRef = useRef<string[]>([]);
  const heldRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  const startHold = useCallback(() => {
    if (disabled) return;
    heldRef.current = true;
    setHeld(true);
    setDuration(0);
    setInterimPreview("");
    accumulatedRef.current = [];

    timerRef.current = window.setInterval(() => setDuration((d) => d + 1), 1000);

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    const r = new SR();
    r.continuous = true;
    r.interimResults = true;
    r.lang = "en-US";

    r.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const text = String(e.results[i][0]?.transcript || "").trim();
        if (!text) continue;
        if (e.results[i].isFinal) {
          accumulatedRef.current.push(text);
          setInterimPreview("");
        } else {
          interim = text;
        }
      }
      setInterimPreview(interim);
    };

    r.onerror = () => {};
    r.onend = () => {
      if (heldRef.current) try { r.start(); } catch {}
    };

    recogRef.current = r;
    try { r.start(); } catch {}
  }, [disabled]);

  const stopHold = useCallback(() => {
    if (!heldRef.current) return;
    heldRef.current = false;
    setHeld(false);
    setInterimPreview("");

    if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; }

    if (recogRef.current) {
      recogRef.current.onend = null;
      try { recogRef.current.stop(); } catch {}
      recogRef.current = null;
    }

    const full = accumulatedRef.current.join(" ").trim();
    accumulatedRef.current = [];
    setDuration(0);

    if (full.length > 2) onRelease(full);
  }, [onRelease]);

  useEffect(() => () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    if (recogRef.current) { recogRef.current.onend = null; try { recogRef.current.stop(); } catch {} }
  }, []);

  return (
    <div
      onMouseDown={startHold}
      onMouseUp={stopHold}
      onMouseLeave={stopHold}
      onTouchStart={(e) => { e.preventDefault(); startHold(); }}
      onTouchEnd={(e) => { e.preventDefault(); stopHold(); }}
      onTouchCancel={(e) => { e.preventDefault(); stopHold(); }}
      className={`
        relative flex flex-col items-center justify-center gap-3
        w-full rounded-2xl border-2 transition-all duration-150
        touch-none select-none cursor-pointer
        ${held
          ? "border-blue-400 bg-blue-400/10 shadow-[0_0_0_4px_hsl(215_100%_60%/0.10)]"
          : disabled
          ? "border-border bg-card opacity-40 cursor-not-allowed"
          : "border-border bg-card hover:border-primary/30 hover:bg-secondary/20 active:scale-[0.99]"
        }
      `}
      style={{ height: "100px" }}
    >
      {held && <div className="absolute inset-0 rounded-2xl border-2 border-blue-400/20 animate-ping pointer-events-none" />}

      <div className={`flex items-center gap-3 transition-all duration-150 ${held ? "scale-105" : ""}`}>
        <div className={`flex items-center justify-center rounded-full w-10 h-10 transition-all ${held ? "bg-blue-400 shadow-[0_0_16px_hsl(215_100%_60%/0.4)]" : "bg-secondary"}`}>
          <Mic className={`h-5 w-5 ${held ? "text-white" : "text-muted-foreground"}`} />
        </div>
        <div>
          <p className={`text-sm font-bold leading-none ${held ? "text-blue-400" : "text-muted-foreground"}`}>
            {held ? `Listening${duration > 0 ? ` · ${duration}s` : "..."}` : "Hold while prospect speaks"}
          </p>
          <p className="text-xs text-muted-foreground/40 mt-1">
            {held
              ? interimPreview
                ? `"${interimPreview.slice(0, 60)}${interimPreview.length > 60 ? "…" : ""}"`
                : "Hold through pauses — release when done"
              : "Hold through pauses. Release when they finish."
            }
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   SETUP SCREEN
───────────────────────────────────────────────────────────── */
function SetupScreen({ profiles, onStart }: {
  profiles: CompanyProfile[];
  onStart: (c: { company: CompanyProfile | null; prospectInfo: string; callGoal: string }) => void;
}) {
  const [selectedId, setSelectedId] = useState(profiles[0]?.id ?? "");
  const [prospectInfo, setProspectInfo] = useState("");
  const [callGoal, setCallGoal] = useState("close_deal");
  const [dropdown, setDropdown] = useState(false);
  const selected = profiles.find((p) => p.id === selectedId) ?? null;

  return (
    <div className="max-w-lg mx-auto space-y-6 animate-slide-up">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md gradient-primary">
            <Phone className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-primary border border-primary/30 rounded-full px-2 py-0.5">
            <Crown className="h-3 w-3" /> PRO
          </span>
        </div>
        <h1 className="text-2xl font-black text-foreground tracking-tight">Live Call Assistant</h1>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          Hold the button while your prospect speaks. Release — your script appears instantly.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Company profile</label>
        {profiles.length === 0 ? (
          <Link to="/company" className="flex items-center justify-between rounded-lg border border-dashed border-primary/40 bg-primary/5 p-4 text-sm text-primary hover:bg-primary/10 transition-colors">
            <span className="flex items-center gap-2"><Plus className="h-4 w-4" /> Add a company profile first</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : (
          <div className="relative">
            <button onClick={() => setDropdown((d) => !d)} className="w-full flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground hover:border-primary/30 transition-colors">
              <span className="flex items-center gap-2"><Building2 className="h-4 w-4 text-muted-foreground" />{selected?.name ?? "Select"}</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
            {dropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-border bg-card shadow-lg z-10 overflow-hidden">
                {profiles.map((p) => (
                  <button key={p.id} onClick={() => { setSelectedId(p.id); setDropdown(false); }} className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-secondary/50 ${selectedId === p.id ? "text-primary" : "text-foreground"}`}>
                    <span>{p.name}</span>
                    {p.is_default && <span className="text-xs text-muted-foreground">Default</span>}
                  </button>
                ))}
                <Link to="/company" className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground hover:text-foreground border-t border-border transition-colors">
                  <Plus className="h-3.5 w-3.5" /> Manage profiles
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Goal</label>
        <div className="grid grid-cols-2 gap-2">
          {[["close_deal", "🤝 Close the deal"], ["book_meeting", "📅 Book a meeting"]].map(([val, label]) => (
            <button key={val} onClick={() => setCallGoal(val)} className={`rounded-lg border py-3 text-sm font-medium transition-all ${callGoal === val ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:border-primary/30"}`}>{label}</button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Who are you calling? <span className="normal-case font-normal text-muted-foreground/50">(optional)</span>
        </label>
        <textarea value={prospectInfo} onChange={(e) => setProspectInfo(e.target.value)} placeholder="e.g. VP Sales at Acme Corp, currently on Salesforce..." rows={2} className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
      </div>

      <div className="rounded-lg border border-border bg-secondary/20 p-4 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">How it works</p>
        <ol className="space-y-1.5 text-sm text-muted-foreground">
          <li className="flex gap-2"><span className="text-primary font-bold flex-shrink-0">1.</span>Open your call in Teams / Zoom / Meet in another tab</li>
          <li className="flex gap-2"><span className="text-primary font-bold flex-shrink-0">2.</span>Click below — pick the tab, tick <strong className="text-foreground">Share tab audio</strong></li>
          <li className="flex gap-2"><span className="text-primary font-bold flex-shrink-0">3.</span><strong className="text-foreground">Hold the button</strong> while prospect speaks — through pauses too</li>
          <li className="flex gap-2"><span className="text-primary font-bold flex-shrink-0">4.</span>Release — full script streams in instantly</li>
        </ol>
      </div>

      <button onClick={() => onStart({ company: selected, prospectInfo, callGoal })} disabled={profiles.length === 0} className="w-full flex items-center justify-center gap-2 rounded-lg gradient-primary py-4 text-base font-black uppercase tracking-wider text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40">
        <Monitor className="h-5 w-5" /> Connect call tab <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   CONNECT MODAL
───────────────────────────────────────────────────────────── */
function ConnectModal({ onConnected, onCancel }: {
  onConnected: (stream: MediaStream) => void;
  onCancel: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const attempt = async () => {
    setBusy(true); setErr("");
    try {
      const stream = await (navigator.mediaDevices as any).getDisplayMedia({
        video: { frameRate: 15 },
        audio: { echoCancellation: false, noiseSuppression: false, sampleRate: 44100 },
        preferCurrentTab: false,
        selfBrowserSurface: "exclude",
        surfaceSwitching: "include",
        systemAudio: "exclude",
      });
      onConnected(stream);
    } catch (e: any) {
      if (e.name === "NotAllowedError") setErr("Permission denied. Try again and pick your call tab.");
      else if (e.name === "NotFoundError") setErr("No tab selected. Try again.");
      else setErr(e.message || "Could not capture tab.");
      setBusy(false);
    }
  };

  useEffect(() => { attempt(); }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm rounded-2xl border border-primary/30 bg-card p-8 space-y-5 relative text-center">
        <button onClick={onCancel} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary mx-auto">
          <Monitor className="h-7 w-7 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-lg font-black text-foreground">Select your call tab</h2>
          <p className="text-sm text-muted-foreground mt-1">Pick Teams / Zoom / Meet. Tick <strong className="text-foreground">Share tab audio</strong>.</p>
        </div>
        {busy && !err && <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Waiting...</div>}
        {err && (
          <>
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive text-left flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" /> {err}
            </div>
            <button onClick={attempt} className="w-full flex items-center justify-center gap-2 rounded-lg gradient-primary py-3 font-bold text-sm text-primary-foreground hover:opacity-90">Try again</button>
          </>
        )}
        <button onClick={onCancel} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   ACTIVE CALL
   Layout:
   ┌─────────────────────────────────────────┐
   │ top bar (52px)                          │
   ├──────────┬──────────────────────────────┤
   │ sidebar  │  scripts (flex-1, scrollable)│
   │ video    │                              │
   │ heard    │                              │
   │          ├──────────────────────────────┤
   │          │  hold button (fixed 130px)   │
   └──────────┴──────────────────────────────┘
───────────────────────────────────────────────────────────── */
function ActiveCallScreen({ company, prospectInfo, callGoal, stream, onEnd }: {
  company: CompanyProfile | null; prospectInfo: string; callGoal: string;
  stream: MediaStream; onEnd: () => void;
}) {
  const [entries, setEntries] = useState<ScriptEntry[]>([]);
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showVideo, setShowVideo] = useState(true);
  const [showTranscript, setShowTranscript] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sellerLinesRef = useRef<string[]>([]);

  const { streamInto, cancel } = useStreamingScript();

  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play().catch(() => {}); }
    const track = stream.getVideoTracks()[0];
    if (track) track.onended = onEnd;
    return () => stream.getTracks().forEach((t) => t.stop());
  }, []);

  // Scroll to bottom when new entry or tokens arrive
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [entries]);

  const handleProspectUtterance = useCallback((fullText: string) => {
    const now = Date.now();
    setTranscript((prev) => [...prev, { speaker: "prospect", text: fullText, timestamp: now }]);

    const id = `${now}`;
    setEntries((prev) => [...prev, { id, prospectSaid: fullText, script: "", timestamp: now, streaming: true }]);
    setIsGenerating(true);

    streamInto(
      fullText,
      sellerLinesRef.current.slice(-3),
      company,
      callGoal,
      prospectInfo,
      (tok) => setEntries((prev) => prev.map((e) => e.id === id ? { ...e, script: e.script + tok } : e)),
      () => {
        setEntries((prev) => prev.map((e) => e.id === id ? { ...e, streaming: false } : e));
        setIsGenerating(false);
      },
    );
  }, [streamInto, company, callGoal, prospectInfo]);

  const handleEnd = () => {
    stream.getTracks().forEach((t) => t.stop());
    cancel();
    onEnd();
  };

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="fixed inset-0 top-14 flex flex-col bg-background overflow-hidden">

      {/* ── TOP BAR ── */}
      <div className="flex items-center justify-between px-5 border-b border-border bg-card flex-shrink-0" style={{ height: "52px" }}>
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="h-2 w-2 rounded-full bg-success animate-pulse flex-shrink-0" />
          <span className="text-xs text-muted-foreground truncate hidden sm:inline">
            {company?.name ?? "Live Call"} · {callGoal === "close_deal" ? "Close deal" : "Book meeting"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {isGenerating && (
            <span className="flex items-center gap-1.5 text-xs text-primary">
              <Zap className="h-3 w-3 animate-pulse" /> Writing...
            </span>
          )}
          <button
            onClick={() => setShowTranscript((t) => !t)}
            className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${showTranscript ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
          >
            Transcript
          </button>
          <span className="font-mono text-sm text-muted-foreground tabular-nums">{fmt(elapsed)}</span>
          <button onClick={handleEnd} className="flex items-center gap-1.5 rounded-lg bg-destructive px-3 py-1.5 text-xs font-bold text-destructive-foreground hover:opacity-90 transition-opacity">
            <PhoneOff className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">End call</span>
          </button>
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT SIDEBAR ── */}
        <div className={`flex-shrink-0 border-r border-border flex flex-col bg-card transition-all duration-300 ${showVideo ? "w-56" : "w-0 border-r-0 overflow-hidden"}`}>
          {showVideo && (
            <>
              {/* Thumbnail */}
              <div className="relative bg-black flex-shrink-0" style={{ height: "130px" }}>
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-contain" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
                <div className="absolute bottom-2 left-2.5 flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                  <span className="text-[9px] font-bold tracking-widest text-white/60 uppercase">Live</span>
                </div>
              </div>

              {/* Heard log */}
              <div className="flex-1 overflow-y-auto min-h-0 p-3 space-y-2">
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">Heard</p>
                {transcript.length === 0 && (
                  <p className="text-[10px] text-muted-foreground/30 leading-relaxed">Hold the button when your prospect speaks.</p>
                )}
                {transcript.slice(-12).map((line, i) => (
                  <div key={i} className="flex gap-1.5 items-start text-blue-400/60">
                    <span className="text-[9px] font-bold uppercase tracking-wider flex-shrink-0 mt-0.5">P</span>
                    <p className="text-[11px] leading-snug line-clamp-2">{line.text}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Toggle strip */}
        <button
          onClick={() => setShowVideo((v) => !v)}
          className="flex-shrink-0 flex items-center justify-center w-5 border-r border-border bg-card hover:bg-secondary/50 transition-colors"
        >
          {showVideo
            ? <ChevronLeft className="h-3 w-3 text-muted-foreground/50" />
            : <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
          }
        </button>

        {/* ── RIGHT: VERTICAL STACK ── */}
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col overflow-hidden">

            {/* SCRIPTS — fills all available height, scrollable */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-5 space-y-5 min-h-0">

              {entries.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-center select-none">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-dashed border-border">
                    <Mic className="h-6 w-6 text-muted-foreground/20" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-muted-foreground/40">No scripts yet</p>
                    <p className="text-xs text-muted-foreground/25 mt-1">Hold the button below while your prospect talks.</p>
                  </div>
                </div>
              )}

              {entries.map((entry, idx) => {
                const isLatest = idx === entries.length - 1;
                return (
                  <div key={entry.id} className="space-y-2">
                    {/* Trigger label */}
                    <div className="flex items-center gap-2 pl-1">
                      <div className="h-1 w-1 rounded-full bg-blue-400/40 flex-shrink-0" />
                      <p className="text-[11px] text-blue-400/50 italic truncate">
                        {entry.prospectSaid.length > 100 ? entry.prospectSaid.slice(0, 100) + "…" : entry.prospectSaid}
                      </p>
                    </div>

                    {/* Script bubble */}
                    <div className={`rounded-xl px-5 py-4 transition-all duration-300 ${
                      isLatest
                        ? "bg-card border border-primary/20 shadow-[0_0_0_1px_hsl(82_100%_57%/0.08),0_4px_20px_hsl(82_100%_57%/0.05)]"
                        : "bg-secondary/20 border border-border/20"
                    }`}>
                      {entry.script ? (
                        <p className={`font-semibold leading-relaxed ${
                          isLatest ? "text-foreground text-[17px]" : "text-muted-foreground/50 text-sm"
                        }`}>
                          {entry.script}
                          {entry.streaming && (
                            <span className="inline-block w-[2px] h-[1em] bg-primary animate-pulse ml-1 align-middle rounded-full" />
                          )}
                        </p>
                      ) : (
                        <div className="flex items-center gap-2.5 py-0.5">
                          {[0, 1, 2].map((i) => (
                            <span key={i} className="h-1.5 w-1.5 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                          ))}
                          <span className="text-sm text-muted-foreground">Writing your script...</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              <div className="h-2" />
            </div>

            {/* HOLD BUTTON — pinned to bottom, fixed height */}
            <div className="flex-shrink-0 border-t border-border bg-card px-5 py-4 space-y-3">
              <HoldButton onRelease={handleProspectUtterance} disabled={isGenerating} />
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground/40">
                  {entries.length > 0 ? `${entries.length} script${entries.length === 1 ? "" : "s"} generated` : "Ready"}
                </p>
                <button onClick={handleEnd} className="flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2 text-xs font-bold text-destructive hover:bg-destructive/10 transition-colors">
                  <PhoneOff className="h-3.5 w-3.5" /> End & breakdown
                </button>
              </div>
            </div>

          </div>

          {/* Full transcript panel */}
          {showTranscript && (
            <div className="w-64 flex-shrink-0 border-l border-border flex flex-col bg-card overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-border flex-shrink-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Transcript</p>
                <button onClick={() => setShowTranscript(false)} className="text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {transcript.length === 0 && <p className="text-xs text-muted-foreground/40 pt-2 text-center">Nothing yet.</p>}
                {transcript.map((line, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <div className="flex-shrink-0 h-5 w-5 flex items-center justify-center rounded-full text-[9px] font-black bg-blue-400/15 text-blue-400">P</div>
                    <div className="max-w-[80%] rounded-lg px-3 py-1.5 text-xs leading-relaxed bg-blue-400/8 text-foreground border border-blue-400/10">
                      {line.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   ENDED + MAIN PAGE
───────────────────────────────────────────────────────────── */
function EndedScreen({ scriptCount, onRetry }: { scriptCount: number; onRetry: () => void }) {
  const navigate = useNavigate();
  return (
    <div className="max-w-md mx-auto text-center space-y-6 animate-slide-up py-8">
      <div className="space-y-2">
        <div className="text-4xl mb-3">📵</div>
        <h2 className="text-2xl font-black text-foreground">Call ended</h2>
        <p className="text-sm text-muted-foreground">{scriptCount} scripts generated</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button onClick={onRetry} className="flex items-center justify-center gap-2 rounded-lg gradient-primary py-3 font-bold text-sm text-primary-foreground hover:opacity-90 transition-opacity">
          <Phone className="h-4 w-4" /> New call
        </button>
        <button onClick={() => navigate("/")} className="flex items-center justify-center gap-2 rounded-lg border border-border bg-card py-3 font-bold text-sm text-foreground hover:bg-secondary transition-colors">
          Dashboard
        </button>
      </div>
    </div>
  );
}

export default function LiveCallPage() {
  const navigate = useNavigate();
  const { profile, loading } = useProfile();
  const { profiles, loading: profilesLoading } = useCompanyProfiles();

  const [phase, setPhase] = useState<Phase>("setup");
  const [callConfig, setCallConfig] = useState<{ company: CompanyProfile | null; prospectInfo: string; callGoal: string } | null>(null);
  const [captureStream, setCaptureStream] = useState<MediaStream | null>(null);
  const [scriptCount, setScriptCount] = useState(0);

  if (loading) return <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center"><Zap className="h-6 w-6 text-primary animate-pulse" /></div>;

  if (!profile?.is_pro) return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
      <div className="max-w-sm text-center space-y-4">
        <Crown className="h-10 w-10 text-accent mx-auto" />
        <h2 className="text-xl font-black text-foreground">Pro Feature</h2>
        <p className="text-sm text-muted-foreground">Live Call Assistant is exclusive to CloserLab Pro.</p>
        <button onClick={() => navigate("/pricing")} className="w-full rounded-lg gradient-primary py-3 font-bold text-primary-foreground hover:opacity-90 transition-opacity">Upgrade to Pro</button>
      </div>
    </div>
  );

  return (
    <>
      {phase === "connecting" && callConfig && (
        <ConnectModal
          onConnected={(s) => { setCaptureStream(s); setPhase("active"); }}
          onCancel={() => setPhase("setup")}
        />
      )}
      {phase === "active" && captureStream && callConfig && (
        <ActiveCallScreen
          {...callConfig}
          stream={captureStream}
          onEnd={() => setPhase("ended")}
        />
      )}
      {(phase === "setup" || phase === "ended") && (
        <div className="container mx-auto max-w-2xl px-4 py-8">
          {phase === "setup" && !profilesLoading && (
            <SetupScreen profiles={profiles} onStart={(cfg) => { setCallConfig(cfg); setPhase("connecting"); }} />
          )}
          {phase === "ended" && (
            <EndedScreen scriptCount={scriptCount} onRetry={() => { setCaptureStream(null); setCallConfig(null); setScriptCount(0); setPhase("setup"); }} />
          )}
        </div>
      )}
    </>
  );
}