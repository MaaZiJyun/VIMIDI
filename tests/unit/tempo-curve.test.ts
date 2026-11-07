import { describe, expect, it } from "vitest";
import { buildTempoCurve } from "../../src/features/studio/tempo/tempo-curve";

describe("native MIDI tempo visualization", () => {
  it("preserves abrupt minima/maxima while limiting drawing work for dense tempo ramps", () => {
    const points = Array.from({ length: 24000 }, (_, index) => ({
      time: index * 0.1,
      beat: 0,
      bpm: 100 + Math.sin(index / 100) * 20,
    }));
    points[11111] = { ...points[11111], bpm: 230 };
    points[12345] = { ...points[12345], bpm: 45 };
    const curve = buildTempoCurve(points, 2400);
    expect(curve.min).toBe(45);
    expect(curve.max).toBe(230);
    expect(curve.sampled).toContain(points[11111]);
    expect(curve.sampled).toContain(points[12345]);
    expect(curve.sampled[0]).toBe(points[0]);
    expect(curve.sampled[curve.sampled.length - 1]).toBe(
      points[points.length - 1],
    );
    expect(curve.sampled.length).toBeLessThanOrEqual(964);
    expect(points).toHaveLength(24000);
  });
  it("renders a valid flat curve for constant native tempo", () => {
    const curve = buildTempoCurve([{ time: 0, beat: 0, bpm: 120 }], 20);
    expect(curve.path).toBe("M0.00,60.00H1000");
    expect(curve.min).toBe(120);
    expect(curve.max).toBe(120);
  });
});
