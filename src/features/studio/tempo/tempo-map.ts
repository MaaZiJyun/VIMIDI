import type { TempoPoint } from "../model/types";

export function normalizeTempoMap(points: readonly TempoPoint[]): TempoPoint[] {
  const sorted = points
    .filter(
      (point) =>
        Number.isFinite(point.time) &&
        point.time >= 0 &&
        Number.isFinite(point.bpm) &&
        point.bpm > 0,
    )
    .slice()
    .sort((a, b) => a.time - b.time);
  const result: TempoPoint[] = [{ time: 0, beat: 0, bpm: 120 }];
  for (const point of sorted) {
    const previous = result[result.length - 1];
    const next = {
      time: point.time,
      beat: previous.beat + ((point.time - previous.time) * previous.bpm) / 60,
      bpm: point.bpm,
    };
    if (point.time === previous.time) result[result.length - 1] = next;
    else if (point.bpm !== previous.bpm) result.push(next);
  }
  return result;
}

function findPoint(
  points: readonly TempoPoint[],
  value: number,
  axis: "time" | "beat",
): TempoPoint {
  let low = 0;
  let high = points.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (points[middle][axis] <= value) low = middle + 1;
    else high = middle;
  }
  return points[Math.max(0, low - 1)] ?? { time: 0, beat: 0, bpm: 120 };
}

export function timeToBeat(
  time: number,
  points: readonly TempoPoint[],
): number {
  const point = findPoint(points, time, "time");
  return point.beat + ((time - point.time) * point.bpm) / 60;
}

export function beatToTime(
  beat: number,
  points: readonly TempoPoint[],
): number {
  const point = findPoint(points, beat, "beat");
  return point.time + ((beat - point.beat) * 60) / point.bpm;
}

export function bpmAtTime(time: number, points: readonly TempoPoint[]): number {
  return findPoint(points, time, "time").bpm;
}
