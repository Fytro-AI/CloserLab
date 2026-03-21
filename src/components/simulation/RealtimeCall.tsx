import { useEffect, useRef, useState, useCallback } from "react";
import { PhoneOff, Mic, MicOff, Volume2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PERSONAS } from "@/lib/game-data";

interface RealtimeCallProps {
  persona: string;
  industry: string;
  difficulty: string;
  simulationMode?: string;
  interviewRole?: string;
  interviewCompany?: string;
  prospectName?: string;
  prospectCompany?: string;
  prospectBackstory?: string;
  challengeSystemPrompt?: string;
  customIndustryDescription?: string;
  onEndCall: (transcript: { role: "user" | "assistant"; content: string }[]) => void;
}

type ConnectionStatus = "connecting" | "connected" | "error" | "ended";

const HANGUP_PHRASE = "ending the call now";

const DIAL_TONE_URL =
  "https://pgzjqdlsvjuuimfrnbzv.supabase.co/storage/v1/object/public/ambients/call_beep.wav";

const AMBIENT_URL =
  "https://pgzjqdlsvjuuimfrnbzv.supabase.co/storage/v1/object/public/ambients/office-ambience.mp3";

const SPOT_EFFECTS: string[] = [
  "https://pgzjqdlsvjuuimfrnbzv.supabase.co/storage/v1/object/public/ambients/keyboard.mp3",
  "https://pgzjqdlsvjuuimfrnbzv.supabase.co/storage/v1/object/public/ambients/257261__laurawebdev__mouse-rightclick-doubleclick.wav",
  "https://pgzjqdlsvjuuimfrnbzv.supabase.co/storage/v1/object/public/ambients/23406__stackpool__creak-from-a-chair-in-whalewatching-capt-stan-mackinnons-office-cape-breton.wav",
  "https://pgzjqdlsvjuuimfrnbzv.supabase.co/storage/v1/object/public/ambients/180244__mohomran__shuffle-papers_1.wav",
  "https://pgzjqdlsvjuuimfrnbzv.supabase.co/storage/v1/object/public/ambients/48638__ohnoimdead__onid_pen_in.wav",
];

export default function RealtimeCall({
  persona,
  industry,
  difficulty,
  simulationMode = "discovery",
  interviewRole,
  interviewCompany,
  prospectName,
  prospectCompany,
  prospectBackstory,
  challengeSystemPrompt,
  customIndustryDescription,
  onEndCall,
}: RealtimeCallProps) {
  const personaData = PERSONAS.find((p) => p.id === persona) || PERSONAS[0];
  const isInterview = simulationMode === "interview";

  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [hangingUp, setHangingUp] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const currentAssistantRef = useRef<string>("");
  const callEndedRef = useRef(false);
  const userHasSpokenRef = useRef(false);

  const dialToneAudioRef = useRef<HTMLAudioElement | null>(null);
  const ambientRef = useRef<HTMLAudioElement | null>(null);
  const aiAudioRef = useRef<HTMLAudioElement | null>(null);
  const spotTimerRef = useRef<number | null>(null);
  const spotPoolRef = useRef<HTMLAudioElement[]>([]);
  const silenceTimerRef = useRef<number | null>(null);

  // ── Timer ──
  useEffect(() => {
    if (status !== "connected") return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [status]);

  useEffect(() => {
    if (elapsed >= 600) handleEndCall();
  }, [elapsed]);

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  // ── Silence detection ──
  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) window.clearTimeout(silenceTimerRef.current);
  }, []);

  const silenceStepRef = useRef(0);

  const scheduleSilencePrompt = useCallback(() => {
    clearSilenceTimer();
    silenceStepRef.current = 0;

    const runStep = (step: number, delay: number) => {
      silenceTimerRef.current = window.setTimeout(() => {
        if (callEndedRef.current || userHasSpokenRef.current) return;
        if (dcRef.current?.readyState !== "open") return;

        if (step === 1) {
          dcRef.current.send(JSON.stringify({
            type: "conversation.item.create",
            item: { type: "message", role: "user", content: [{ type: "input_text", text: "(The candidate hasn't spoken yet. Say something natural like 'Hello? Can you hear me?' — stay in character.)" }] },
          }));
          dcRef.current.send(JSON.stringify({ type: "response.create" }));
          runStep(2, 5000);
        } else if (step === 2) {
          dcRef.current.send(JSON.stringify({
            type: "conversation.item.create",
            item: { type: "message", role: "user", content: [{ type: "input_text", text: "(Still no response. Say something brief — 'Anyone there?', 'I'm losing you...' — stay in character.)" }] },
          }));
          dcRef.current.send(JSON.stringify({ type: "response.create" }));
          runStep(3, 5000);
        } else if (step === 3) {
          dcRef.current.send(JSON.stringify({
            type: "conversation.item.create",
            item: { type: "message", role: "user", content: [{ type: "input_text", text: "(Still no response. Wrap up naturally then say 'ending the call now'.)" }] },
          }));
          dcRef.current.send(JSON.stringify({ type: "response.create" }));
        }
      }, delay);
    };

    runStep(1, 7000 + Math.random() * 3000);
  }, [clearSilenceTimer]);

  // ── Spot effects ──
  const startSpotEffects = useCallback(() => {
    if (SPOT_EFFECTS.length === 0) return;
    spotPoolRef.current = SPOT_EFFECTS.map((url) => {
      const a = new Audio(url);
      a.volume = 0.5;
      a.preload = "auto";
      return a;
    });
    const fire = () => {
      const pool = spotPoolRef.current;
      if (pool.length === 0) return;
      const audio = pool[Math.floor(Math.random() * pool.length)];
      audio.currentTime = 0;
      audio.play().catch(() => {});
      spotTimerRef.current = window.setTimeout(fire, 8000 + Math.random() * 17000);
    };
    spotTimerRef.current = window.setTimeout(fire, 5000 + Math.random() * 7000);
  }, []);

  const stopSpotEffects = useCallback(() => {
    if (spotTimerRef.current) window.clearTimeout(spotTimerRef.current);
    spotPoolRef.current = [];
  }, []);

  const startDialTone = useCallback(() => {
    try {
      const dial = new Audio(DIAL_TONE_URL);
      dial.loop = true;
      dial.volume = 0.8;
      dial.play().catch(() => {});
      dialToneAudioRef.current = dial;
    } catch (e) { console.warn("Dial tone failed:", e); }
  }, []);

  const startAmbient = useCallback(() => {
    if (dialToneAudioRef.current) { dialToneAudioRef.current.pause(); dialToneAudioRef.current = null; }
    try {
      const amb = new Audio(AMBIENT_URL);
      amb.loop = true;
      amb.volume = 0.5;
      amb.play().catch(() => {});
      ambientRef.current = amb;
    } catch (e) { console.warn("Ambient failed:", e); }
    startSpotEffects();
  }, [startSpotEffects]);

  const cleanup = useCallback(() => {
    if (dialToneAudioRef.current) { dialToneAudioRef.current.pause(); dialToneAudioRef.current = null; }
    if (ambientRef.current) { ambientRef.current.pause(); ambientRef.current = null; }
    if (aiAudioRef.current) { aiAudioRef.current.pause(); aiAudioRef.current = null; }
    stopSpotEffects();
    clearSilenceTimer();
    dcRef.current?.close();
    pcRef.current?.close();
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
  }, [stopSpotEffects, clearSilenceTimer]);

  const handleEndCall = useCallback(async (transcriptOverride?: typeof transcript) => {
    if (callEndedRef.current) return;
    callEndedRef.current = true;
    try {
      const hangup = new Audio("https://pgzjqdlsvjuuimfrnbzv.supabase.co/storage/v1/object/public/ambients/178537__kyliank__phone-hang-up-suspend.mp3");
      hangup.volume = 1.0;
      hangup.play().catch(() => {});
    } catch {}
    cleanup();
    setStatus("ended");
    const finalTranscript = transcriptOverride ?? transcript;
    const minutesUsed = Math.ceil(elapsed / 60);
    if (minutesUsed > 0) {
      await supabase.functions.invoke("track-voice-usage", { body: { minutesUsed } });
    }
    onEndCall(finalTranscript);
  }, [cleanup, elapsed, onEndCall, transcript]);

  const handleDataChannelMessage = useCallback((event: MessageEvent) => {
    try {
      const msg = JSON.parse(event.data);
      switch (msg.type) {
        case "response.audio.delta": setIsSpeaking(true); break;
        case "response.audio.done": setIsSpeaking(false); break;
        case "response.audio_transcript.delta":
          currentAssistantRef.current += msg.delta || "";
          break;
        case "response.audio_transcript.done": {
          const text = currentAssistantRef.current.trim();
          currentAssistantRef.current = "";
          if (!text) break;
          const displayText = text.replace(new RegExp(HANGUP_PHRASE, "gi"), "").trim();
          setTranscript((prev) => {
            const updated = [...prev, { role: "assistant" as const, content: displayText }];
            if (text.toLowerCase().includes(HANGUP_PHRASE) && !callEndedRef.current) {
              setHangingUp(true);
              setTimeout(() => handleEndCall(updated), 2200);
            }
            return updated;
          });
          break;
        }
        case "conversation.item.input_audio_transcription.completed":
          if (msg.transcript?.trim()) {
            setTranscript((prev) => [...prev, { role: "user", content: msg.transcript.trim() }]);
          }
          break;
        case "input_audio_buffer.speech_started":
          userHasSpokenRef.current = true;
          setIsUserSpeaking(true);
          clearSilenceTimer();
          break;
        case "input_audio_buffer.speech_stopped":
          setIsUserSpeaking(false);
          break;
        case "input_audio_buffer.committed":
          if (userHasSpokenRef.current && dcRef.current?.readyState === "open") {
            dcRef.current.send(JSON.stringify({ type: "response.create" }));
          }
          break;
        case "error":
          console.error("Realtime error:", msg);
          break;
      }
    } catch (e) { console.error("DC parse error:", e); }
  }, [handleEndCall, clearSilenceTimer]);

  const connect = useCallback(async () => {
    try {
      setStatus("connecting");
      setErrorMsg(null);
      callEndedRef.current = false;
      userHasSpokenRef.current = false;

      startDialTone();

      // ── Pass simulationMode + interview fields to the edge function ──
      const tokenResp = await supabase.functions.invoke("realtime-token", {
        body: {
          simulationMode,
          difficulty,
          // Interview fields
          interviewRole,
          interviewCompany,
          // Buyer/prospect fields (ignored for interview mode)
          persona,
          industry,
          prospectName,
          prospectCompany,
          prospectBackstory,
          challengeSystemPrompt,
          customIndustryDescription,
        },
      });

      if (tokenResp.error || !tokenResp.data?.client_secret) {
        throw new Error(tokenResp.data?.error || "Failed to get voice session token");
      }

      const ephemeralKey = tokenResp.data.client_secret.value;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      pc.ontrack = (e) => {
        const audio = new Audio();
        audio.srcObject = e.streams[0];
        audio.autoplay = true;
        audio.play().catch(() => {});
        aiAudioRef.current = audio;
      };

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;
      dc.onmessage = handleDataChannelMessage;
      dc.onopen = () => {
        setStatus("connected");
        startAmbient();

        if (dcRef.current?.readyState === "open") {
          const openingCue = isInterview
            ? "(The interview is starting. Greet the candidate warmly and ask them to introduce themselves.)"
            : "(Phone ringing — you pick up)";
          dcRef.current.send(JSON.stringify({
            type: "conversation.item.create",
            item: { type: "message", role: "user", content: [{ type: "input_text", text: openingCue }] },
          }));
          dcRef.current.send(JSON.stringify({ type: "response.create" }));
        }

        setTimeout(() => scheduleSilencePrompt(), 3000);
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpResp = await fetch("https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview", {
        method: "POST",
        headers: { "Authorization": `Bearer ${ephemeralKey}`, "Content-Type": "application/sdp" },
        body: offer.sdp,
      });

      if (!sdpResp.ok) throw new Error("WebRTC negotiation failed");

      const answerSdp = await sdpResp.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
          setStatus("error");
          setErrorMsg("Connection lost. Please try again.");
        }
      };
    } catch (e: any) {
      if (dialToneAudioRef.current) { dialToneAudioRef.current.pause(); dialToneAudioRef.current = null; }
      console.error("Connect error:", e);
      setStatus("error");
      setErrorMsg(e.message || "Failed to start voice call.");
    }
  }, [
    simulationMode, difficulty, interviewRole, interviewCompany,
    persona, industry, prospectName, prospectCompany, prospectBackstory,
    challengeSystemPrompt, customIndustryDescription,
    handleDataChannelMessage, startDialTone, startAmbient, scheduleSilencePrompt,
  ]);

  useEffect(() => { connect(); return () => cleanup(); }, []);

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => { t.enabled = isMuted; });
      setIsMuted(!isMuted);
    }
  };

  // ── Interview UI labels ──
  const callerName = isInterview ? (interviewCompany || "Interviewer") : (prospectName || personaData.label);
  const callerSub  = isInterview ? `${interviewRole || "Sales"} Interview` : (prospectCompany || "Prospect");
  const speakingLabel = isInterview ? "Interviewer is speaking..." : `${prospectName || "Prospect"} is speaking...`;
  const connectingLabel = isInterview ? "Joining interview..." : "Calling...";
  const ringingLabel = isInterview ? "🔔 Connecting to interviewer..." : "🔔 Ringing...";

  if (status === "error") {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center gap-6 px-4">
        <div className="text-4xl">📵</div>
        <p className="text-foreground font-bold text-lg">No answer</p>
        <p className="text-muted-foreground text-sm text-center max-w-xs">{errorMsg}</p>
        <button onClick={connect} className="rounded-lg gradient-primary px-6 py-3 font-bold text-primary-foreground">Call again</button>
        <button onClick={() => onEndCall(transcript)} className="text-sm text-muted-foreground underline">Leave</button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center gap-8 px-4">

      {status === "connecting" && (
        <div className="absolute inset-0 bg-background/90 flex flex-col items-center justify-center gap-4 z-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-foreground font-semibold">{connectingLabel}</p>
          <p className="text-xs text-muted-foreground animate-pulse">{ringingLabel}</p>
        </div>
      )}

      {hangingUp && (
        <div className="absolute inset-0 bg-background/90 flex flex-col items-center justify-center gap-4 z-10 animate-fade-in">
          <div className="text-4xl">{isInterview ? "🤝" : "📵"}</div>
          <p className="text-foreground font-bold text-lg">{isInterview ? "Interview complete." : "They hung up."}</p>
          <p className="text-muted-foreground text-sm">Heading to your breakdown...</p>
        </div>
      )}

      <div className="flex flex-col items-center gap-3">
        <div
          className="relative flex items-center justify-center rounded-full bg-secondary border-2 transition-all duration-300"
          style={{
            width: 96, height: 96,
            borderColor: isSpeaking ? "#84cc16" : "transparent",
            boxShadow: isSpeaking ? "0 0 32px rgba(132,204,22,0.5)" : "none",
          }}
        >
          <span className="text-5xl">{isInterview ? "🎙️" : personaData.icon}</span>
          {isSpeaking && (
            <div className="absolute -bottom-1 -right-1 flex items-center justify-center rounded-full bg-primary w-6 h-6">
              <Volume2 className="h-3 w-3 text-primary-foreground" />
            </div>
          )}
        </div>
        <div className="text-center">
          <p className="font-bold text-foreground text-lg">{callerName}</p>
          <p className="text-muted-foreground text-sm">{callerSub}</p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-2">
          <div
            className="h-2 w-2 rounded-full transition-all"
            style={{
              background: status === "connected" ? "#84cc16" : "#555",
              boxShadow: status === "connected" ? "0 0 8px #84cc16" : "none",
            }}
          />
          <span className="text-sm font-mono text-muted-foreground">{formatTime(elapsed)}</span>
        </div>
        <div className="h-5 flex items-center">
          {isSpeaking && <span className="text-xs text-primary animate-pulse">{speakingLabel}</span>}
          {isUserSpeaking && !isSpeaking && <span className="text-xs text-accent animate-pulse">Listening...</span>}
          {status === "connected" && !isSpeaking && !isUserSpeaking && (
            <span className="text-xs text-muted-foreground">
              {isInterview ? "Introduce yourself to begin..." : "Say something to start the call..."}
            </span>
          )}
        </div>
      </div>

      {transcript.length > 0 && (
        <div className="w-full max-w-sm space-y-2 px-2">
          {transcript.slice(-2).map((t, i) => (
            <div
              key={i}
              className={`text-xs rounded-lg px-3 py-2 ${
                t.role === "assistant"
                  ? "bg-secondary text-secondary-foreground"
                  : "bg-primary/10 text-foreground text-right"
              }`}
            >
              {t.content}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-6">
        <button onClick={toggleMute} className="flex flex-col items-center gap-1">
          <div
            className="flex items-center justify-center rounded-full w-14 h-14 transition-all"
            style={{
              background: isMuted ? "rgba(239,68,68,0.15)" : "rgba(132,204,22,0.12)",
              border: `1px solid ${isMuted ? "rgba(239,68,68,0.5)" : "rgba(132,204,22,0.4)"}`,
            }}
          >
            {isMuted ? <MicOff className="h-5 w-5 text-destructive" /> : <Mic className="h-5 w-5 text-primary" />}
          </div>
          <span className="text-xs text-muted-foreground">{isMuted ? "Unmute" : "Mute"}</span>
        </button>

        <button onClick={() => handleEndCall()} className="flex flex-col items-center gap-1">
          <div className="flex items-center justify-center rounded-full w-16 h-16 bg-destructive transition-all hover:opacity-90">
            <PhoneOff className="h-6 w-6 text-white" />
          </div>
          <span className="text-xs text-muted-foreground">{isInterview ? "End Interview" : "End Call"}</span>
        </button>
      </div>

      <p className="text-xs text-muted-foreground">Pro · Realtime AI Voice</p>
    </div>
  );
}