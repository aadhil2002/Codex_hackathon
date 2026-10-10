import { useEffect, useRef, useState } from "react";

type Props = { disabled: boolean; onRecordingReady: (file: File) => void; onError: (message: string) => void };

export function VoiceRecorder({ disabled, onRecordingReady, onError }: Props) {
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const stopTimerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (stopTimerRef.current !== null) window.clearTimeout(stopTimerRef.current);
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  async function toggle() {
    onError("");
    if (recording) {
      recorderRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = () => {
        if (stopTimerRef.current !== null) window.clearTimeout(stopTimerRef.current);
        const type = recorder.mimeType || "audio/webm";
        const extension = type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm";
        onRecordingReady(new File(chunksRef.current, `shopping-request.${extension}`, { type }));
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setRecording(false);
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
      stopTimerRef.current = window.setTimeout(() => {
        if (recorder.state === "recording") recorder.stop();
        onError("Recording stopped at 30 seconds, the Saaras real-time request limit.");
      }, 29500);
    } catch {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      onError("Microphone access failed. Type your request or try a different browser.");
    }
  }

  return <button className={`voice-button ${recording ? "is-recording" : ""}`} type="button" disabled={disabled} onClick={toggle}>
    <span aria-hidden="true">{recording ? "■" : "●"}</span>{recording ? "Stop recording" : "Speak request"}
  </button>;
}
