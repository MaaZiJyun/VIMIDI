import type { DetectedTempo, MidiProject } from "../model/types";
import { indexNotes } from "../midi/parse-midi";
import { beatToTime, normalizeTempoMap, timeToBeat } from "./tempo-map";

/** Preserve musical beats and note lengths while replacing the original tempo curve. */
export function retimeMidi(
  project: MidiProject,
  segments: readonly DetectedTempo[],
): MidiProject {
  if (!segments.length) return project;
  const tempoMap = normalizeTempoMap(
    segments.map((segment) => ({
      time: segment.start,
      beat: 0,
      bpm: segment.bpm,
    })),
  );
  const notes = project.notes.map((note) => {
    const start = beatToTime(
      timeToBeat(note.start, project.tempoMap),
      tempoMap,
    );
    const end = beatToTime(
      timeToBeat(note.start + note.duration, project.tempoMap),
      tempoMap,
    );
    return { ...note, start, duration: Math.max(0.000001, end - start) };
  });
  const maxEnds = indexNotes(notes);
  return {
    ...project,
    notes,
    maxEnds,
    duration: maxEnds[maxEnds.length - 1],
    bpm: tempoMap[0].bpm,
    tempoMap,
  };
}
