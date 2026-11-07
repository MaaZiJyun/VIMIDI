import { describe, expect, it } from "vitest";
import { Midi } from "@tonejs/midi";
import { existsSync, readFileSync } from "node:fs";
import {
  indexNotes,
  parseMidi,
} from "../../src/features/studio/midi/parse-midi";
import { queryNotes } from "../../src/features/studio/midi/query-notes";
import type { MidiNote } from "../../src/features/studio/model/types";
import {
  bpmAtTime,
  timeToBeat,
} from "../../src/features/studio/tempo/tempo-map";

function fixture() {
  const midi = new Midi();
  midi.header.setTempo(120);
  const track = midi.addTrack();
  track.name = "Piano";
  track.addNote({ midi: 60, time: 0, duration: 20, velocity: 0.8 });
  track.addNote({ midi: 72, time: 2, duration: 1, velocity: 0.5 });
  return parseMidi(midi.toArray().buffer as ArrayBuffer, "test.mid");
}

describe("MIDI import and temporal queries", () => {
  it("rejects files with missing or invalid headers", () => {
    expect(() => parseMidi(new ArrayBuffer(0), "bad.mid")).toThrow("无效");
    expect(() =>
      parseMidi(new TextEncoder().encode("not midi").buffer, "bad.mid"),
    ).toThrow("无效");
  });
  it("rejects a valid MIDI without notes", () => {
    expect(() =>
      parseMidi(new Midi().toArray().buffer as ArrayBuffer, "empty.mid"),
    ).toThrow("没有");
  });
  it("preserves timing, velocity, track identity, and duration", () => {
    const project = fixture();
    expect(project.duration).toBeCloseTo(20);
    expect(project.notes[1]).toMatchObject({
      pitch: 72,
      start: 2,
      duration: 1,
      trackId: 0,
    });
    expect(project.tracks[0]).toMatchObject({ name: "Piano", noteCount: 2 });
    expect(project.maxEnds).toEqual([20, 20]);
  });
  it("reads tempo changes from actual MIDI bytes and applies them to a sustained note", () => {
    const midi = new Midi();
    const ppq = midi.header.ppq;
    midi.header.tempos = [
      { ticks: 0, bpm: 120 },
      { ticks: ppq * 4, bpm: 60 },
    ];
    midi.header.update();
    midi.addTrack().addNote({
      midi: 60,
      ticks: ppq * 3,
      durationTicks: ppq * 3,
      velocity: 1,
    });
    const project = parseMidi(
      midi.toArray().buffer as ArrayBuffer,
      "native-tempo.mid",
    );
    expect(project.tempoEventCount).toBe(2);
    expect(project.tempoMap).toEqual([
      { time: 0, beat: 0, bpm: 120 },
      { time: 2, beat: 4, bpm: 60 },
    ]);
    expect(project.notes[0].start).toBe(1.5);
    expect(project.notes[0].duration).toBe(2.5);
    expect(bpmAtTime(3, project.tempoMap)).toBe(60);
  });
  it("finds sustained notes after later short notes have ended", () => {
    const project = fixture();
    expect(queryNotes(project, 10, 15).map((note) => note.pitch)).toEqual([60]);
    expect(queryNotes(project, 21, 30)).toEqual([]);
    expect(queryNotes(project, -10, -1)).toEqual([]);
  });
  it("matches a linear overlap query across dense and long notes", () => {
    const project = fixture();
    const notes: MidiNote[] = Array.from({ length: 1000 }, (_, index) => ({
      start: index * 0.1,
      duration: index % 29 === 0 ? 30 : 0.08,
      pitch: 60,
      trackId: 0,
      velocity: 1,
    }));
    const dense = { ...project, notes, maxEnds: indexNotes(notes) };
    for (let time = 0; time < 100; time += 0.73) {
      expect(queryNotes(dense, time, time + 5)).toEqual(
        notes.filter(
          (note) =>
            note.start <= time + 5 && note.start + note.duration >= time,
        ),
      );
    }
  });
  const example = "All Tracks in FATE OF THE TREE (Original Mix)2.0.mid";
  it.skipIf(!existsSync(example))(
    "parses the supplied orchestral example",
    () => {
      const bytes = readFileSync(example);
      const project = parseMidi(
        bytes.buffer.slice(
          bytes.byteOffset,
          bytes.byteOffset + bytes.byteLength,
        ),
        example,
      );
      expect(project.tracks.length).toBe(36);
      expect(project.notes.length).toBe(39406);
      expect(project.duration).toBeCloseTo(3677.77, 1);
      expect(queryNotes(project, 1800, 1805).length).toBeGreaterThan(0);
      const raw = new Midi(bytes);
      expect(project.tempoEventCount).toBe(20924);
      expect(project.tempoMap.length).toBeGreaterThan(20000);
      expect(bpmAtTime(0, project.tempoMap)).toBe(64);
      expect(bpmAtTime(300, project.tempoMap)).toBeCloseTo(90, 3);
      expect(bpmAtTime(2400, project.tempoMap)).toBeCloseTo(119.132950387, 6);
      let maxBeatError = 0;
      for (const tempo of raw.header.tempos) {
        maxBeatError = Math.max(
          maxBeatError,
          Math.abs(
            timeToBeat(tempo.time ?? 0, project.tempoMap) -
              tempo.ticks / raw.header.ppq,
          ),
        );
      }
      for (const track of raw.tracks)
        for (const note of track.notes) {
          maxBeatError = Math.max(
            maxBeatError,
            Math.abs(
              timeToBeat(note.time, project.tempoMap) -
                note.ticks / raw.header.ppq,
            ),
            Math.abs(
              timeToBeat(note.time + note.duration, project.tempoMap) -
                (note.ticks + note.durationTicks) / raw.header.ppq,
            ),
          );
        }
      expect(maxBeatError).toBeLessThan(0.000001);
    },
  );
});
