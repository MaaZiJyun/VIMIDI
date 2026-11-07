import { describe, expect, it } from "vitest";
import {
  formatTime,
  getDimensions,
  validateRange,
} from "../../src/features/studio/model/settings";
import { parseByteRange } from "../../src/features/studio/server/byte-range";
import { pianoLayout } from "../../src/features/studio/render/piano-layout";

describe("export timing and geometry", () => {
  it("validates finite ranges against the source audio duration", () => {
    expect(() => validateRange(2, 30, 30)).not.toThrow();
    for (const [start, end] of [
      [-1, 4],
      [4, 4],
      [0, 31],
      [NaN, 4],
      [0, Infinity],
    ])
      expect(() => validateRange(start, end, 30)).toThrow();
  });
  it("produces even H.264 dimensions in every aspect ratio", () => {
    expect(getDimensions("16:9", 1080)).toEqual({ width: 1920, height: 1080 });
    expect(getDimensions("9:16", 720)).toEqual({ width: 720, height: 1280 });
    expect(getDimensions("1:1", 1080)).toEqual({ width: 1080, height: 1080 });
  });
  it("keeps black keys above white-key boundaries", () => {
    const keys = pianoLayout(60, 71, 700);
    expect(keys.filter((key) => !key.black)).toHaveLength(7);
    expect(keys[1]).toMatchObject({ black: true, x: 70, width: 60 });
    expect(keys[11].x + keys[11].width).toBe(700);
  });
  it("formats long recordings and invalid input", () => {
    expect(formatTime(3677.77)).toBe("61:17");
    expect(formatTime(NaN)).toBe("00:00");
    expect(formatTime(2.5, true)).toBe("00:02.5");
  });
});

describe("local example range requests", () => {
  it("supports bounded, open-ended, and suffix byte ranges", () => {
    expect(parseByteRange(null, 100)).toBeNull();
    expect(parseByteRange("bytes=10-29", 100)).toEqual({ start: 10, end: 29 });
    expect(parseByteRange("bytes=80-", 100)).toEqual({ start: 80, end: 99 });
    expect(parseByteRange("bytes=-20", 100)).toEqual({ start: 80, end: 99 });
    expect(parseByteRange("bytes=0-500", 100)).toEqual({ start: 0, end: 99 });
  });
  it("rejects unsatisfiable, malformed, and multipart ranges", () => {
    for (const header of [
      "bytes=200-",
      "bytes=8-2",
      "bytes=-",
      "bytes=-0",
      "bytes=0-1,4-5",
      "x=1-2",
    ])
      expect(() => parseByteRange(header, 100)).toThrow();
  });
});
