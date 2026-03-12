import { useEffect, useRef, useState, useCallback } from "react";
import { PhoneOff, Mic, MicOff, Volume2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PERSONAS } from "@/lib/game-data";

interface RealtimeCallProps {
  persona: string;
  industry: string;
  difficulty: string;
  prospectName?: string;
  prospectCompany?: string;
  prospectBackstory?: string;
  challengeSystemPrompt?: string;
  customIndustryDescription?: string;
  onEndCall: (transcript: { role: "user" | "assistant"; content: string }[]) => void;
}

type ConnectionStatus = "connecting" | "connected" | "error" | "ended";

const PERSONA_PROMPTS: Record<string, string> = {
  skeptical: `You are a NICE BUT SKEPTICAL buyer. You are polite but question everything. Ask for proof, case studies, references. Say things like "I've heard this before" or "Sounds too good to be true". You need to be convinced with concrete evidence. Never be rude, but never be easy either.`,
  aggressive: `You are an AGGRESSIVE buyer. You interrupt long responses. Challenge every claim. Use phrases like "Cut the fluff", "Get to the point", "That's weak". You are impatient, direct, and slightly hostile. Never make it easy. Push back on EVERYTHING.`,
  distracted: `You are a DISTRACTED buyer. You are clearly multitasking. Ask "Can you repeat that?" or "Sorry, what?". Mention other things demanding your attention. Give the seller very small windows to make their point.`,
  budget: `You are a BUDGET-CONSCIOUS buyer. Bring up price within the first 3 exchanges. Mention cash flow, ROI, budget constraints. Push back on price at least twice. Compare to cheaper competitors. Every dollar must be justified.`,
  "time-starved": `You are a TIME-STARVED buyer. You have 3-5 minutes maximum. Skip pleasantries, demand the bottom line. If the seller rambles, cut them off. Mention meetings or deadlines you're rushing to.`,
};

const DIFFICULTY_PROMPTS: Record<string, string> = {
  easy: "Be somewhat receptive. Give the seller openings. Occasionally show interest.",
  medium: "Be moderately challenging. Give some openings but make them work for it.",
  hard: "Be very difficult. Rarely show interest. Make them fight for every inch.",
  nightmare: "Be nearly impossible. Shut down almost everything. Only the most elite pitch would move you.",
};

export default function RealtimeCall({
  persona,
  industry,
  difficulty,
  prospectName,
  prospectCompany,
  prospectBackstory,
  challengeSystemPrompt,
  customIndustryDescription,
  onEndCall,
}: RealtimeCallProps) {
  const personaData = PERSONAS.find((p) => p.id === persona) || PERSONAS[0];

  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<{ role: "user" | "assistant"; content: string }[]>([]);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const currentAssistantRef = useRef<string>("");

  // ── KEY GUARD: only allow response.create after user has actually spoken ──
  const userHasSpokenRef = useRef(false);

  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (status !== "connected") return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [status]);

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const handleDataChannelMessage = useCallback((event: MessageEvent) => {
    try {
      const msg = JSON.parse(event.data);

      switch (msg.type) {

        // ── AI speaking ───────────────────────────────────────────────────────
        case "response.audio.delta":
          setIsSpeaking(true);
          break;

        case "response.audio.done":
          setIsSpeaking(false);
          break;

        // ── AI transcript ─────────────────────────────────────────────────────
        case "response.audio_transcript.delta":
          currentAssistantRef.current += msg.delta || "";
          break;

        case "response.audio_transcript.done":
          if (currentAssistantRef.current.trim()) {
            setTranscript((prev) => [
              ...prev,
              { role: "assistant", content: currentAssistantRef.current.trim() },
            ]);
          }
          currentAssistantRef.current = "";
          break;

        // ── User transcript ───────────────────────────────────────────────────
        case "conversation.item.input_audio_transcription.completed":
          if (msg.transcript?.trim()) {
            setTranscript((prev) => [
              ...prev,
              { role: "user", content: msg.transcript.trim() },
            ]);
          }
          break;

        // ── User voice activity ───────────────────────────────────────────────
        case "input_audio_buffer.speech_started":
          // Mark that the user has genuinely spoken at least once
          userHasSpokenRef.current = true;
          setIsUserSpeaking(true);
          break;

        case "input_audio_buffer.speech_stopped":
          setIsUserSpeaking(false);
          break;

        // ── Only fire response AFTER user has actually spoken ─────────────────
        case "input_audio_buffer.committed":
          if (userHasSpokenRef.current && dcRef.current?.readyState === "open") {
            dcRef.current.send(JSON.stringify({ type: "response.create" }));
          }
          break;

        case "error":
          console.error("Realtime error event:", msg);
          break;
      }
    } catch (e) {
      console.error("DC message parse error:", e);
    }
  }, []);

  const cleanup = useCallback(() => {
    dcRef.current?.close();
    pcRef.current?.close();
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    if (audioRef.current) {
      audioRef.current.srcObject = null;
    }
  }, []);

  const connect = useCallback(async () => {
    try {
      setStatus("connecting");
      setErrorMsg(null);
      userHasSpokenRef.current = false;

      const tokenResp = await supabase.functions.invoke("realtime-token", {
      body: {
        persona,
        industry,
        difficulty,
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

      // 2. Get mic access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      // 3. Create WebRTC peer connection
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      // 4. Remote audio playback
      const audioEl = document.createElement("audio");
      audioEl.autoplay = true;
      audioRef.current = audioEl;
      pc.ontrack = (e) => {
        audioEl.srcObject = e.streams[0];
      };

      // 5. Add local mic track
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // 6. Data channel for events
      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;
      dc.onmessage = handleDataChannelMessage;
      dc.onopen = () => {
        setStatus("connected");
        
        // Inject a silent conversation primer so the AI knows it already picked up
        // This prevents it from defaulting to seller mode on first response
        if (dcRef.current?.readyState === "open") {
          dcRef.current.send(JSON.stringify({
            type: "conversation.item.create",
            item: {
              type: "message",
              role: "user",
              content: [{ type: "input_text", text: "(Phone ringing — you pick up)" }],
            },
          }));
          dcRef.current.send(JSON.stringify({ type: "response.create" }));
        }
      };

      // 7. SDP offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // 8. Send to OpenAI
      const sdpResp = await fetch(
        "https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${ephemeralKey}`,
            "Content-Type": "application/sdp",
          },
          body: offer.sdp,
        }
      );

      if (!sdpResp.ok) {
        throw new Error("WebRTC negotiation failed");
      }

      const answerSdp = await sdpResp.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
          setStatus("error");
          setErrorMsg("Connection lost. Please try again.");
        }
      };

    } catch (e: any) {
      console.error("Realtime connect error:", e);
      setStatus("error");
      setErrorMsg(e.message || "Failed to start voice call.");
    }
  }, [persona, industry, difficulty, prospectName, prospectCompany, prospectBackstory, challengeSystemPrompt, customIndustryDescription, handleDataChannelMessage]);

  useEffect(() => {
    connect();
    return () => cleanup();
  }, []);

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  const handleEndCall = async () => {
    cleanup();
    setStatus("ended");

    const minutesUsed = Math.ceil(elapsed / 60);
    if (minutesUsed > 0) {
      await supabase.functions.invoke("track-voice-usage", {
        body: { minutesUsed },
      });
    }

    onEndCall(transcript);
  };

  // ── Error screen ────────────────────────────────────────────────────────────
  if (status === "error") {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center gap-6 px-4">
        <div className="text-4xl">📵</div>
        <p className="text-foreground font-bold text-lg text-center">Call Failed</p>
        <p className="text-muted-foreground text-sm text-center max-w-xs">{errorMsg}</p>
        <button
          onClick={connect}
          className="rounded-lg gradient-primary px-6 py-3 font-bold text-primary-foreground"
        >
          Try Again
        </button>
        <button
          onClick={() => onEndCall(transcript)}
          className="text-sm text-muted-foreground underline"
        >
          End Call
        </button>
      </div>
    );
  }

  // ── Main call UI ────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center gap-8 px-4">

      {/* Connecting overlay */}
      {status === "connecting" && (
        <div className="absolute inset-0 bg-background/90 flex flex-col items-center justify-center gap-4 z-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-foreground font-semibold">Connecting call...</p>
        </div>
      )}

      {/* Prospect avatar */}
      <div className="flex flex-col items-center gap-3">
        <div
          className="relative flex items-center justify-center rounded-full bg-secondary border-2 transition-all duration-300"
          style={{
            width: 96,
            height: 96,
            borderColor: isSpeaking ? "#84cc16" : "transparent",
            boxShadow: isSpeaking ? "0 0 32px rgba(132,204,22,0.5)" : "none",
          }}
        >
          <span className="text-5xl">{personaData.icon}</span>
          {isSpeaking && (
            <div className="absolute -bottom-1 -right-1 flex items-center justify-center rounded-full bg-primary w-6 h-6">
              <Volume2 className="h-3 w-3 text-primary-foreground" />
            </div>
          )}
        </div>

        <div className="text-center">
          <p className="font-bold text-foreground text-lg">{prospectName || personaData.label}</p>
          <p className="text-muted-foreground text-sm">{prospectCompany || "Prospect"}</p>
        </div>
      </div>

      {/* Timer + speaking indicator */}
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
          {isSpeaking && (
            <span className="text-xs text-primary animate-pulse">
              {prospectName || "Prospect"} is speaking...
            </span>
          )}
          {isUserSpeaking && !isSpeaking && (
            <span className="text-xs text-accent animate-pulse">Listening...</span>
          )}
          {status === "connected" && !isSpeaking && !isUserSpeaking && (
            <span className="text-xs text-muted-foreground">Say something to start the call...</span>
          )}
        </div>
      </div>

      {/* Last 2 transcript lines */}
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

      {/* Controls */}
      <div className="flex items-center gap-6">
        <button onClick={toggleMute} className="flex flex-col items-center gap-1">
          <div
            className="flex items-center justify-center rounded-full w-14 h-14 transition-all"
            style={{
              background: isMuted ? "rgba(239,68,68,0.15)" : "rgba(132,204,22,0.12)",
              border: `1px solid ${isMuted ? "rgba(239,68,68,0.5)" : "rgba(132,204,22,0.4)"}`,
            }}
          >
            {isMuted
              ? <MicOff className="h-5 w-5 text-destructive" />
              : <Mic className="h-5 w-5 text-primary" />
            }
          </div>
          <span className="text-xs text-muted-foreground">{isMuted ? "Unmute" : "Mute"}</span>
        </button>

        <button onClick={handleEndCall} className="flex flex-col items-center gap-1">
          <div className="flex items-center justify-center rounded-full w-16 h-16 bg-destructive transition-all hover:opacity-90">
            <PhoneOff className="h-6 w-6 text-white" />
          </div>
          <span className="text-xs text-muted-foreground">End Call</span>
        </button>
      </div>

      <p className="text-xs text-muted-foreground">Pro · Realtime AI Voice</p>
    </div>
  );
}