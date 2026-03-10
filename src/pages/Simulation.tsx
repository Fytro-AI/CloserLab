import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { PhoneOff, Send, Clock, X } from "lucide-react";
import { PERSONAS } from "@/lib/game-data";
import { supabase } from "@/integrations/supabase/client";
import { useVoiceMode } from "@/hooks/useVoiceMode";
import CallScreen from "@/components/simulation/CallScreen";

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

  const voice = useVoiceMode({
    enabled: voiceEnabled,
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

  // Parse coach tip out of AI text
  const extractCoachTip = (text: string): { display: string; tip: string | null } => {
    // Match [COACH_TIP: ...] across newlines, with or without closing bracket
    const fullMatch = text.match(/\[COACH_TIP:\s*([\s\S]*?)\]/);
    if (fullMatch) {
      const tip = fullMatch[1].trim();
      const display = text.replace(/\[COACH_TIP:[\s\S]*?\]/g, "").trim();
      return { display, tip };
    }
    
    // Partial match — tag opened but stream may not have closed yet
    const partialMatch = text.match(/\[COACH_TIP:\s*([\s\S]*)$/);
    if (partialMatch) {
      // Strip the partial tag from display but don't surface tip yet
      const display = text.replace(/\[COACH_TIP:[\s\S]*$/, "").trim();
      return { display, tip: null };
    }

    return { display: text, tip: null };
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

              // Surface tip when stream is complete enough to have it
              if (tip) {
                setCoachTip(tip);
              }

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

      // After stream ends, trigger tip bounce if we got one
      const { tip: finalTip } = extractCoachTip(assistantSoFar.replace(/\[CALL_ENDED\]/g, "").trim());
      if (finalTip) {
        setCoachTip(finalTip);
        setTipVisible(true);
        setTipOpen(false);
        setTipBouncing(true);
        setTimeout(() => setTipBouncing(false), 3000); // stop bouncing after 3s
      }

    } catch (e) {
      console.error("Stream error:", e);
      setMessages((m) => [...m, { role: "assistant", content: "Connection error. Try again." }]);
    }

    return aiEndedCall;
  };

  const sendFromMessages = async (updated: Message[]) => {
    setIsTyping(true);
    setTipVisible(false); // hide previous tip when user sends a new message
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
        onToggleMic={() => { if (voice.isListening) { voice.stopListening(); } else { void voice.startListening(true); } }}
        onEndCall={endCall}
      />
    );
  }

  return (
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

      {/* Messages + Coach Tip button (relative wrapper) */}
      <div className="relative flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto border-x border-border bg-background p-4 space-y-3">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-lg px-4 py-2.5 text-sm ${msg.role === "user" ? "gradient-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
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

        {/* Coach Tip Notification Badge */}
        {tipVisible && !tipOpen && (
          <button
            onClick={() => { setTipOpen(true); setTipBouncing(false); }}
            style={{
              position: "absolute",
              bottom: "12px",
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "linear-gradient(135deg, #f59e0b, #d97706)",
              color: "white",
              border: "none",
              borderRadius: "999px",
              padding: "8px 16px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 4px 20px rgba(245,158,11,0.45)",
              animation: tipBouncing ? "coachBounce 0.6s ease infinite alternate" : "none",
              zIndex: 10,
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ fontSize: "16px" }}>💡</span>
            Coach's Tip
          </button>
        )}
      </div>

      {/* Coach Tip Modal */}
      {tipOpen && coachTip && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
          onClick={() => setTipOpen(false)}
        >
          <div
            style={{
              background: "linear-gradient(135deg, #1c1917, #292524)",
              border: "1px solid rgba(245,158,11,0.4)",
              borderRadius: "16px",
              padding: "24px",
              maxWidth: "400px",
              width: "100%",
              boxShadow: "0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(245,158,11,0.15)",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setTipOpen(false)}
              style={{
                position: "absolute",
                top: "12px",
                right: "12px",
                background: "rgba(255,255,255,0.08)",
                border: "none",
                borderRadius: "6px",
                padding: "4px",
                cursor: "pointer",
                color: "#a8a29e",
                display: "flex",
                alignItems: "center",
              }}
            >
              <X size={16} />
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
              <span style={{ fontSize: "24px" }}>🎙️</span>
              <div>
                <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#f59e0b", marginBottom: "2px" }}>
                  Coach's Tip
                </div>
                <div style={{ fontSize: "11px", color: "#78716c" }}>for that last objection</div>
              </div>
            </div>

            <p style={{ color: "#e7e5e4", fontSize: "15px", lineHeight: 1.6, margin: 0 }}>
              {coachTip}
            </p>

            <div style={{ marginTop: "18px", paddingTop: "14px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
              <button
                onClick={() => setTipOpen(false)}
                style={{
                  width: "100%",
                  background: "linear-gradient(135deg, #f59e0b, #d97706)",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  padding: "10px",
                  fontWeight: 600,
                  fontSize: "14px",
                  cursor: "pointer",
                }}
              >
                Got it 👊
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bounce keyframe injection */}
      <style>{`
        @keyframes coachBounce {
          0%   { transform: translateX(-50%) translateY(0px); box-shadow: 0 4px 20px rgba(245,158,11,0.45); }
          100% { transform: translateX(-50%) translateY(-8px); box-shadow: 0 12px 30px rgba(245,158,11,0.65); }
        }
      `}</style>

      {/* Input */}
      <div className="flex gap-2 rounded-b-lg border border-border bg-card p-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Type your pitch..."
          disabled={isTyping}
          className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
        />
        <button
          onClick={sendMessage}
          disabled={isTyping}
          className="rounded-md gradient-primary px-3 py-2 text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
        <button
          onClick={endCall}
          className="rounded-md bg-destructive px-3 py-2 text-destructive-foreground hover:opacity-90 transition-opacity"
        >
          <PhoneOff className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}