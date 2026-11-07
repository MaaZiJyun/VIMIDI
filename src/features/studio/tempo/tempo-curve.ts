import type { TempoPoint } from "../model/types";

/** Reduce drawing work only; playback always keeps every original tempo event. */
export function buildTempoCurve(
  points: readonly TempoPoint[],
  noteDuration: number,
) {
  const duration = Math.max(
    1,
    noteDuration,
    points[points.length - 1]?.time ?? 0,
  );
  let min = points[0]?.bpm ?? 120;
  let max = min;
  const buckets = new Map<
    number,
    { first: number; last: number; min: number; max: number }
  >();
  for (let index = 0; index < points.length; index++) {
    const point = points[index];
    min = Math.min(min, point.bpm);
    max = Math.max(max, point.bpm);
    const bucket = Math.floor((point.time / duration) * 240);
    const group = buckets.get(bucket);
    if (!group)
      buckets.set(bucket, {
        first: index,
        last: index,
        min: index,
        max: index,
      });
    else {
      group.last = index;
      if (point.bpm < points[group.min].bpm) group.min = index;
      if (point.bpm > points[group.max].bpm) group.max = index;
    }
  }
  const indices = new Set<number>();
  for (const group of buckets.values())
    for (const index of [group.first, group.min, group.max, group.last])
      indices.add(index);
  const sampled = [...indices]
    .sort((a, b) => a - b)
    .map((index) => points[index]);
  const y = (bpm: number) =>
    max === min ? 60 : 104 - ((bpm - min) / (max - min)) * 88;
  const path =
    sampled
      .map((point, index) => {
        const x = ((point.time / duration) * 1000).toFixed(2);
        return index
          ? `H${x}V${y(point.bpm).toFixed(2)}`
          : `M${x},${y(point.bpm).toFixed(2)}`;
      })
      .join("") + "H1000";
  return { path, min, max, duration, sampled };
}
