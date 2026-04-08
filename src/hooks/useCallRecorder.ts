import { useRef, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UseCallRecorderReturn {
  startRecording: (stream: MediaStream) => void;
  stopRecording: () => Promise<Blob | null>;
  uploadRecording: (blob: Blob, callId: string) => Promise<string | null>;
  isRecording: boolean;
  recordingError: string | null;
}

/**
 * useCallRecorder
 *
 * Captures the local microphone track during a voice call session.
 * Call startRecording(stream) when the WebRTC session starts.
 * Call stopRecording() when the call ends — it returns the audio Blob.
 * Call uploadRecording(blob, callId) to push it to Supabase Storage
 * and link it to the call_history row.
 *
 * Strategy: we record only the local mic stream (the user's voice).
 * The AI responses are text → TTS, so we already have the transcript.
 * A future v2 can mix both tracks with AudioContext if desired.
 */
export function useCallRecorder(): UseCallRecorderReturn {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingError, setRecordingError] = useState<string | null>(null);

  const startRecording = useCallback((stream: MediaStream) => {
    try {
      chunksRef.current = [];
      setRecordingError(null);

      // Pick the best supported format
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")
        ? "audio/ogg;codecs=opus"
        : "audio/mp4";

      const recorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 64000, // 64kbps — good quality, reasonable file size
      });

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onerror = (e) => {
        console.error("MediaRecorder error:", e);
        setRecordingError("Recording failed");
        setIsRecording(false);
      };

      // Collect chunks every 5 seconds for resilience
      recorder.start(5000);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      console.error("startRecording error:", err);
      setRecordingError("Could not start recording");
    }
  }, []);

  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        setIsRecording(false);
        resolve(null);
        return;
      }

      recorder.onstop = () => {
        const chunks = chunksRef.current;
        if (chunks.length === 0) {
          resolve(null);
          return;
        }
        const mimeType = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunks, { type: mimeType });
        chunksRef.current = [];
        setIsRecording(false);
        resolve(blob);
      };

      recorder.stop();
      mediaRecorderRef.current = null;
    });
  }, []);

  const uploadRecording = useCallback(async (
    blob: Blob,
    callId: string
  ): Promise<string | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.error("No auth session for upload");
        return null;
      }

      const ext = blob.type.includes("mp4") ? "mp4"
        : blob.type.includes("ogg") ? "ogg"
        : "webm";

      const formData = new FormData();
      formData.append("audio", blob, `recording.${ext}`);
      formData.append("call_id", callId);

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(
        `${supabaseUrl}/functions/v1/upload-recording`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            // Note: do NOT set Content-Type — browser sets it with boundary for multipart
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        console.error("Upload failed:", err);
        return null;
      }

      const data = await response.json();
      return data.path ?? null;
    } catch (err) {
      console.error("uploadRecording error:", err);
      return null;
    }
  }, []);

  return {
    startRecording,
    stopRecording,
    uploadRecording,
    isRecording,
    recordingError,
  };
}