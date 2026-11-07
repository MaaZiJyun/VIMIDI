import type { MidiNote, MidiProject } from "../model/types";

/** Binary search the prefix-max index so sustained notes are never skipped. */
export function queryNotes(
  project: MidiProject,
  from: number,
  to: number,
): readonly MidiNote[] {
  let low = 0;
  let high = project.notes.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (project.maxEnds[middle] < from) low = middle + 1;
    else high = middle;
  }
  const result: MidiNote[] = [];
  for (let index = low; index < project.notes.length; index++) {
    const note = project.notes[index];
    if (note.start > to) break;
    if (note.start + note.duration >= from) result.push(note);
  }
  return result;
}
