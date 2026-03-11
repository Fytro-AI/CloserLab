import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { PhoneOff, Send, Clock, X } from "lucide-react";
import { PERSONAS } from "@/lib/game-data";
import { supabase } from "@/integrations/supabase/client";
import { useVoiceMode } from "@/hooks/useVoiceMode";
import CallScreen from "@/components/simulation/CallScreen";
import RealtimeCall from "@/components/simulation/RealtimeCall";
import { useProfile } from "@/hooks/useProfile";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function Simulation() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    persona = "skeptical",
    industry = "saas",
    difficulty = "easy",
    voiceMode: initialVoiceMode = false,
    prospectName,
    prospectCompany,
    prospectBackstory,
    challengeId,
    challengeName,
    challengeGoal,
    challengePassScore,
    challengeSystemPrompt,
    customIndustryDescription,
  } = (location.state as any) || {};
  const personaData = PERSONAS.find((p) => p.id === persona) || PERSONAS[0];

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [voiceEnabled] = useState(initialVoiceMode);
  const { profile } = useProfile();

  // Coach tip state
  const [coachTip, setCoachTip] = useState<string | null>(null);
  const [tipVisible, setTipVisible] = useState(false);
  const [tipOpen, setTipOpen] = useState(false);
  const [tipBouncing, setTipBouncing] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const callEndedRef = useRef(false);
  const lastSpokenIndexRef = useRef(-1);

  const handleVoiceTranscript = useCallback((text: string) => {
    if (callEndedRef.current || isTyping) return;
    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => {
      const updated = [...prev, userMsg];
      sendFromMessages(updated);
      return updated;
    });
  }, [isTyping]);

  const isRealtimePro = voiceEnabled && profile?.subscription_tier === "pro";

  const voice = useVoiceMode({
    enabled: voiceEnabled && !isRealtimePro,
    onTranscript: handleVoiceTranscript,
  });

  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    if (!voiceEnabled || isTyping) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.role === "assistant" && messages.length - 1 > lastSpokenIndexRef.current) {
      lastSpokenIndexRef.current = messages.length - 1;
      voice.speak(lastMsg.content).then(() => {
        if (!callEndedRef.current && !voice.isIOS) {
          void voice.startListening();
        }
      });
    }
  }, [messages, isTyping, voiceEnabled]);

  useEffect(() => {
    if (!voiceEnabled || isTyping || callEndedRef.current) return;
    if (voice.isIOS) return;
    if (voice.isListening || voice.isSpeaking) return;
    const timer = window.setTimeout(() => { void voice.startListening(); }, 900);
    return () => window.clearTimeout(timer);
  }, [isTyping, voice.isListening, voice.isSpeaking, voice.startListening, voice.isIOS, voiceEnabled]);

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const extractCoachTip = (text: string): { display: string; tip: string | null } => {
    const fullMatch = text.match(/\[COACH_TIP:\s*([\s\S]*?)\]/);
    const tip = fullMatch ? fullMatch[1].trim() : null;
    // Strip the tag and any leading newlines/spaces before it
    const display = text
      .replace(/\n*\[COACH_TIP:[\s\S]*?\]/g, "")
      .replace(/\n*\[COACH_TIP:[\s\S]*$/, "") // partial tag
      .trim();
    return { display, tip };
  };

  const streamAIResponse = async (conversationHistory: Message[]): Promise<boolean> => {
    const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/simulation-chat`;
    let aiEndedCall = false;

    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          messages: conversationHistory,
          industry,
          difficulty,
          persona,
          prospectName,
          prospectCompany,
          prospectBackstory,
          challengeSystemPrompt,
          customIndustryDescription,
        }),
      });

      if (!resp.ok || !resp.body) {
        const errData = await resp.json().catch(() => ({}));
        setMessages((m) => [...m, { role: "assistant", content: errData.error || "Connection lost. Try again." }]);
        return false;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let assistantSoFar = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { streamDone = true; break; }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantSoFar += content;
              if (assistantSoFar.includes("[CALL_ENDED]")) aiEndedCall = true;

              const { display: displayText, tip } = extractCoachTip(
                assistantSoFar.replace(/\[CALL_ENDED\]/g, "").trim()
              );

              if (tip) setCoachTip(tip);

              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant" && !conversationHistory.includes(last)) {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: displayText } : m);
                }
                return [...prev, { role: "assistant", content: displayText }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      const { tip: finalTip } = extractCoachTip(assistantSoFar.replace(/\[CALL_ENDED\]/g, "").trim());
      if (finalTip) {
        setCoachTip(finalTip);
        setTipVisible(true);
        setTipOpen(false);
        setTipBouncing(true);
        setTimeout(() => setTipBouncing(false), 3000);
      } else {
        setTipVisible(false);
      }
    } catch (e) {
      console.error("Stream error:", e);
      setMessages((m) => [...m, { role: "assistant", content: "Connection error. Try again." }]);
    }

    return aiEndedCall;
  };

  const sendFromMessages = async (updated: Message[]) => {
    setIsTyping(true);
    setTipVisible(false);
    setTipOpen(false);
    if (voiceEnabled) voice.stopListening();
    const aiEnded = await streamAIResponse(updated);
    setIsTyping(false);
    if (aiEnded) {
      callEndedRef.current = true;
      setTimeout(() => endCall(), 2000);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isTyping || callEndedRef.current) return;
    const userMsg: Message = { role: "user", content: input.trim() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    await sendFromMessages(updated);
  };

  const endCall = () => {
    voice.stopSpeaking();
    voice.stopListening();
    navigate("/breakdown", {
      state: { persona, industry, difficulty, duration: elapsed, transcript: messages, challengeId, challengeName, challengeGoal, challengePassScore },
    });
  };

  const lastAIMessage = [...messages].reverse().find(m => m.role === "assistant")?.content || "";

  if (voiceEnabled) {
    if (profile?.subscription_tier === "pro") {
      return (
        <RealtimeCall
          persona={persona}
          industry={industry}
          difficulty={difficulty}
          prospectName={prospectName}
          prospectCompany={prospectCompany}
          prospectBackstory={prospectBackstory}
          challengeSystemPrompt={challengeSystemPrompt}
          customIndustryDescription={customIndustryDescription}
          elapsed={elapsed}
          onEndCall={(transcript) =>
            navigate("/breakdown", {
              state: {
                persona,
                industry,
                difficulty,
                duration: elapsed,
                transcript,
                challengeId,
                challengeName,
                challengeGoal,
                challengePassScore,
              },
            })
          }
        />
      );
    }

    // Fallback: non-Pro users who somehow got here go to old TTS CallScreen
    return (
      <CallScreen
        prospectName={prospectName || personaData.label}
        prospectCompany={prospectCompany || "Prospect"}
        personaIcon={personaData.icon}
        elapsed={elapsed}
        isListening={voice.isListening}
        isSpeaking={voice.isSpeaking}
        isTyping={isTyping}
        interimText={voice.interimText}
        lastAIMessage={lastAIMessage}
        isIOS={voice.isIOS}
        onMicDown={() => voice.startHoldToTalk()}
        onMicUp={() => voice.stopHoldToTalk()}
        onToggleMic={() => {
          if (voice.isListening) { voice.stopListening(); }
          else { void voice.startListening(true); }
        }}
        onEndCall={endCall}
      />
    );
  }

  return (
    <>
      <style>{`
        @keyframes coachBounce {
          0%   { transform: translateY(0px);  box-shadow: 0 0 8px rgba(132,204,22,0.5); }
          100% { transform: translateY(-5px); box-shadow: 0 0 20px rgba(132,204,22,0.9); }
        }
      `}</style>

      <div className="container mx-auto flex h-[calc(100vh-3.5rem)] max-w-2xl flex-col px-4 py-4">

        {/* Challenge banner */}
        {challengeId && (
          <div className="rounded-t-lg border border-b-0 border-accent/30 bg-accent/10 px-3 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-accent">
              🎯 {challengeName}
            </div>
            <div className="text-xs text-muted-foreground">Goal: {challengeGoal}</div>
          </div>
        )}

        {/* Header */}
        <div className={`flex items-center justify-between border border-border bg-card p-3 ${challengeId ? "" : "rounded-t-lg"}`}>
          <div className="flex items-center gap-2">
            <span className="text-xl">{personaData.icon}</span>
            <div>
              <div className="text-sm font-bold text-foreground">{prospectName || personaData.label}</div>
              <div className="text-xs text-muted-foreground">{prospectCompany || "Prospect"} • Active Call</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-sm font-mono text-muted-foreground">
              <Clock className="h-4 w-4" />
              {formatTime(elapsed)}
            </div>
            <div className="h-2 w-2 rounded-full bg-success animate-pulse-glow" />
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto border-x border-border bg-background p-4 space-y-3">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-lg px-4 py-2.5 text-sm ${
                msg.role === "user"
                  ? "gradient-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          {isTyping && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex justify-start">
              <div className="bg-secondary text-muted-foreground rounded-lg px-4 py-2.5 text-sm">
                <span className="animate-pulse">typing...</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div className="flex gap-2 rounded-b-lg border border-border bg-card p-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Type your pitch..."
            disabled={isTyping}
            className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
          />

          {/* Send */}
          <button
            onClick={sendMessage}
            disabled={isTyping}
            className="rounded-md gradient-primary px-3 py-2 text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>

          {/* Coach Tip icon — only when a tip is available */}
          {tipVisible && (
            <div style={{ position: "relative" }}>
              {/* Speech bubble popover */}
              {tipOpen && coachTip && (
                <div style={{
                  position: "absolute",
                  bottom: "calc(100% + 12px)",
                  right: 0,
                  width: "272px",
                  background: "#0f0f0f",
                  border: "1px solid rgba(132,204,22,0.35)",
                  borderRadius: "12px",
                  padding: "16px",
                  boxShadow: "0 0 0 1px rgba(132,204,22,0.08), 0 0 40px rgba(132,204,22,0.12), 0 12px 40px rgba(0,0,0,0.7)",
                  zIndex: 100,
                }}>
                  {/* Tail */}
                  <div style={{
                    position: "absolute",
                    bottom: "-6px",
                    right: "11px",
                    width: "11px",
                    height: "11px",
                    background: "#0f0f0f",
                    border: "1px solid rgba(132,204,22,0.35)",
                    borderTop: "none",
                    borderLeft: "none",
                    transform: "rotate(45deg)",
                  }} />
                  {/* Header */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                    <span style={{
                      fontSize: "10px",
                      fontWeight: 800,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: "#84cc16",
                    }}>
                      💡 Coach's Tip
                    </span>
                    <button
                      onClick={() => setTipOpen(false)}
                      style={{ background: "none", border: "none", color: "#555", cursor: "pointer", padding: "0", lineHeight: 1, fontSize: "14px" }}
                    >
                      <X size={13} />
                    </button>
                  </div>
                  {/* Divider */}
                  <div style={{ height: "1px", background: "rgba(132,204,22,0.12)", marginBottom: "10px" }} />
                  {/* Tip text */}
                  <p style={{ color: "#d4d4d4", fontSize: "13px", lineHeight: 1.6, margin: 0 }}>
                    {coachTip}
                  </p>
                </div>
              )}

              {/* The icon button */}
              <button
                onClick={() => { setTipOpen((o) => !o); setTipBouncing(false); }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "38px",
                  height: "38px",
                  background: tipOpen ? "#84cc16" : "rgba(132,204,22,0.12)",
                  border: `1px solid ${tipOpen ? "#84cc16" : "rgba(132,204,22,0.4)"}`,
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "17px",
                  lineHeight: 1,
                  transition: "background 0.15s, border-color 0.15s",
                  animation: tipBouncing ? "coachBounce 0.5s ease infinite alternate" : "none",
                }}
                title="Coach's Tip"
              >
                💡
              </button>
            </div>
          )}

          {/* End call */}
          <button
            onClick={endCall}
            className="rounded-md bg-destructive px-3 py-2 text-destructive-foreground hover:opacity-90 transition-opacity"
          >
            <PhoneOff className="h-4 w-4" />
          </button>
        </div>

      </div>
    </>
  );
}