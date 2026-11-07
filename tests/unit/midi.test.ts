import { describe, expect, it } from "vitest";
import { Midi } from "@tonejs/midi";
import { existsSync, readFileSync } from "node:fs";
import {
  indexNotes,
  parseMidi,
} from "../../src/features/studio/midi/parse-midi";
import { queryNotes } from "../../src/features/studio/midi/query-notes";
import type { MidiNote } from "../../src/features/studio/model/types";

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
    },
  );
});
