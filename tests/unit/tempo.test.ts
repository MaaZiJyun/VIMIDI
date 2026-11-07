import { describe, expect, it } from "vitest";
import { Midi } from "@tonejs/midi";
import {
  normalizeTempoMap,
  timeToBeat,
  beatToTime,
} from "../../src/features/studio/tempo/tempo-map";
import { retimeMidi } from "../../src/features/studio/tempo/retime-midi";
import { parseMidi } from "../../src/features/studio/midi/parse-midi";
import { detectWindow } from "../../src/features/studio/tempo/detect-window";

function clicks(bpm: number, duration = 12) {
  const rate = 11025;
  const samples = new Float32Array(rate * duration);
  for (let beat = 0; beat < duration; beat += 60 / bpm) {
    const start = Math.round(beat * rate);
    for (
      let index = 0;
      index < rate * 0.08 && start + index < samples.length;
      index++
    ) {
      samples[start + index] =
        Math.sin((index * 2 * Math.PI * 180) / rate) *
        Math.exp(-index / (rate * 0.015));
    }
  }
  return samples;
}

describe("dynamic tempo mapping", () => {
  it("integrates tempo changes continuously and inverts beat/time conversions", () => {
    const map = normalizeTempoMap([
      { time: 0, beat: 0, bpm: 120 },
      { time: 10, beat: 20, bpm: 60 },
    ]);
    expect(timeToBeat(12, map)).toBe(22);
    expect(beatToTime(22, map)).toBe(12);
    for (const time of [-1, 0, 5.5, 10, 12, 60])
      expect(beatToTime(timeToBeat(time, map), map)).toBeCloseTo(time);
  });
  it("uses the last event at a shared timestamp and supplies the standard initial tempo", () => {
    const map = normalizeTempoMap([
      { time: 3, beat: 0, bpm: 100 },
      { time: 3, beat: 0, bpm: 80 },
    ]);
    expect(map).toEqual([
      { time: 0, beat: 0, bpm: 120 },
      { time: 3, beat: 6, bpm: 80 },
    ]);
  });
  it("retimes a note spanning MIDI tempo changes and preserves its musical duration", () => {
    const midi = new Midi();
    midi.header.setTempo(120);
    midi.addTrack().addNote({ midi: 60, time: 8, duration: 4, velocity: 1 });
    const original = {
      ...parseMidi(midi.toArray().buffer as ArrayBuffer, "tempo.mid"),
      tempoMap: normalizeTempoMap([
        { time: 0, beat: 0, bpm: 120 },
        { time: 10, beat: 20, bpm: 60 },
      ]),
    };
    const result = retimeMidi(original, [
      { start: 0, end: 10, bpm: 60, confidence: 1, detected: true },
      { start: 10, end: 30, bpm: 120, confidence: 1, detected: true },
    ]);
    expect(result.notes[0].start).toBe(13);
    expect(result.notes[0].duration).toBe(3);
    expect(result.maxEnds).toEqual([16]);
    expect(original.notes[0].start).toBe(8);
    expect(original.notes[0].duration).toBe(4);
    expect(retimeMidi(original, [])).toBe(original);
  });
  it("detects different local tempos using the real BPM detector", async () => {
    const first = await detectWindow(clicks(120), 11025, 120);
    const second = await detectWindow(clicks(150), 11025, first.bpm);
    expect(first.detected).toBe(true);
    expect(first.bpm).toBeCloseTo(120, 0);
    expect(second.detected).toBe(true);
    expect(second.bpm).toBeCloseTo(150, 0);
  });
  it("keeps the reference tempo when silence has no reliable pulse", async () => {
    expect(
      await detectWindow(new Float32Array(11025 * 12), 11025, 96),
    ).toMatchObject({ detected: false, bpm: 96 });
  });
});
