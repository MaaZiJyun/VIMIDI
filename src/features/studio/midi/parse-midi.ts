import { Midi } from "@tonejs/midi";
import type { MidiNote, MidiProject } from "../model/types";

export function indexNotes(notes: readonly MidiNote[]): number[] {
  let maxEnd = 0;
  return notes.map((note) => {
    maxEnd = Math.max(maxEnd, note.start + note.duration);
    return maxEnd;
  });
}

export function parseMidi(data: ArrayBuffer, fileName: string): MidiProject {
  const header = new Uint8Array(data, 0, Math.min(4, data.byteLength));
  if (String.fromCharCode(...header) !== "MThd")
    throw new Error("无效的 MIDI 文件，请选择标准 .mid 或 .midi 文件。");
  if (data.byteLength > 20 * 1024 * 1024)
    throw new Error("MIDI 文件过大，请使用 20 MB 以内的文件。");
  let midi: Midi;
  try {
    midi = new Midi(data);
  } catch {
    throw new Error("MIDI 文件无法解析，文件可能已损坏。");
  }
  const tracks = midi.tracks.flatMap((track, id) =>
    track.notes.length
      ? [
          {
            id,
            name: track.name.trim() || `音轨 ${id + 1}`,
            instrument: track.instrument.name,
            noteCount: track.notes.length,
          },
        ]
      : [],
  );
  const notes: MidiNote[] = midi.tracks
    .flatMap((track, trackId) =>
      track.notes.map((note) => ({
        pitch: note.midi,
        start: note.time,
        duration: note.duration,
        velocity: note.velocity,
        trackId,
      })),
    )
    .filter(
      (note) =>
        [note.start, note.duration, note.velocity].every(Number.isFinite) &&
        note.start >= 0 &&
        note.duration > 0 &&
        note.pitch >= 0 &&
        note.pitch <= 127,
    )
    .sort((a, b) => a.start - b.start);
  if (!notes.length) throw new Error("MIDI 中没有可用于可视化的音符。");
  let min = 127;
  let max = 0;
  for (const note of notes) {
    min = Math.min(min, note.pitch);
    max = Math.max(max, note.pitch);
  }
  const maxEnds = indexNotes(notes);
  return {
    name: midi.name.trim() || fileName.replace(/\.midi?$/i, ""),
    duration: maxEnds[maxEnds.length - 1],
    bpm: midi.header.tempos[0]?.bpm ?? 120,
    tracks,
    notes,
    maxEnds,
    minPitch: Math.max(0, Math.floor(min / 12) * 12),
    maxPitch: Math.min(
      127,
      Math.max(
        Math.floor(min / 12) * 12 + 23,
        Math.ceil((max + 1) / 12) * 12 - 1,
      ),
    ),
  };
}
