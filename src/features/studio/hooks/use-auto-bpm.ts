"use client";

import { useEffect, useMemo, useState } from "react";
import type { AudioAsset, DetectedTempo, MidiProject } from "../model/types";
import { analyzeAudioTempo } from "../tempo/analyze-audio";
import { retimeMidi } from "../tempo/retime-midi";

interface Analysis {
  audio: AudioAsset;
  reference: number;
  segments: DetectedTempo[];
  error: string | null;
}

export function useAutoBpm(
  audio: AudioAsset | null,
  original: MidiProject | null,
) {
  const [enabled, setEnabled] = useState(false);
  const [result, setResult] = useState<Analysis | null>(null);
  const [scan, setScan] = useState<{
    audio: AudioAsset;
    fraction: number;
  } | null>(null);
  const reference = original?.bpm ?? 120;
  const current =
    result?.audio === audio && result?.reference === reference ? result : null;

  useEffect(() => {
    if (!enabled || !audio || !original || current) return;
    const controller = new AbortController();
    void analyzeAudioTempo(audio, reference, controller.signal, (fraction) => {
      if (!controller.signal.aborted) setScan({ audio, fraction });
    })
      .then((segments) => {
        if (!controller.signal.aborted)
          setResult({ audio, reference, segments, error: null });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setResult({
            audio,
            reference,
            segments: [],
            error: error instanceof Error ? error.message : "BPM 分析失败。",
          });
      });
    return () => controller.abort();
  }, [enabled, audio, original, reference, current]);

  const project = useMemo(
    () =>
      enabled && current?.segments.length && original
        ? retimeMidi(original, current.segments)
        : original,
    [enabled, current, original],
  );
  return {
    enabled,
    setEnabled: (next: boolean) => {
      if (next && !current) setScan(null);
      setEnabled(next);
    },
    project,
    retry: () => {
      setResult(null);
      setScan(null);
    },
    analyzing: enabled && !!audio && !!original && !current,
    progress: scan?.audio === audio ? scan.fraction : 0,
    segments: enabled ? (current?.segments ?? []) : [],
    error: enabled ? (current?.error ?? null) : null,
  };
}
