import { useRef, useState, useCallback } from "react";

export function useRecorder(stream: MediaStream | null) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const timerRef = useRef<number | null>(null);

  const start = useCallback(() => {
    if (!stream) return;
    const mimeType = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
    ].find(t => MediaRecorder.isTypeSupported(t)) ?? 'video/webm';

    const rec = new MediaRecorder(stream, { mimeType, bitsPerSecond: 2_500_000 });
    chunksRef.current = [];
    rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    rec.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      a.href = url;
      a.download = `mobilecast_${ts}.webm`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    };
    rec.start(200);
    recorderRef.current = rec;
    setRecording(true);
    const t0 = Date.now();
    timerRef.current = window.setInterval(() => setDuration(Math.floor((Date.now() - t0) / 1000)), 1000);
  }, [stream]);

  const stop = useCallback(() => {
    recorderRef.current?.stop();
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const toggle = useCallback(() => {
    if (recording) stop(); else start();
  }, [recording, start, stop]);

  return { recording, duration, start, stop, toggle };
}

export function formatDuration(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}
