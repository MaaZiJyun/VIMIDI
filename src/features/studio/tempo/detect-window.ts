import { analyzeChannelData } from "realtime-bpm-analyzer/node";

export interface WindowDetection {
  bpm: number;
  confidence: number;
  detected: boolean;
}

/** The package's PCM-only entry uses no Node I/O or Web Audio globals and can run in a worker. */
export async function detectWindow(
  samples: Float32Array,
  sampleRate: number,
  reference: number,
): Promise<WindowDetection> {
  const candidates = await analyzeChannelData(samples, sampleRate, {
    detector: "tempogram",
  });
  const best = candidates[0];
  if (!best || best.confidence < 0.2)
    return {
      bpm: reference,
      confidence: best?.confidence ?? 0,
      detected: false,
    };
  // Resolve half/double-time ambiguity against the previous accepted tempo (initially the MIDI tempo).
  const octaves = [best.tempo / 2, best.tempo, best.tempo * 2].filter(
    (bpm) => bpm >= 35 && bpm <= 300,
  );
  const bpm = octaves.reduce(
    (chosen, value) =>
      Math.abs(Math.log2(value / reference)) <
      Math.abs(Math.log2(chosen / reference))
        ? value
        : chosen,
    best.tempo,
  );
  return { bpm, confidence: best.confidence, detected: true };
}
