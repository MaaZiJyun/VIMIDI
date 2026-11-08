import { describe, expect, it, vi, afterEach } from "vitest";
import {
  extractDominantColors,
  extractImageColors,
} from "../../src/features/studio/render/extract-image-color";

function pixels(...groups: [number, number, number, number, number][]) {
  return new Uint8ClampedArray(
    groups.flatMap(([count, red, green, blue, alpha]) =>
      Array.from({ length: count }, () => [red, green, blue, alpha]).flat(),
    ),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("background note color extraction", () => {
  it.each([
    [255, 0, 0, "#ff3d3d"],
    [0, 255, 0, "#3dff3d"],
    [0, 0, 255, "#3d3dff"],
  ])(
    "preserves the hue of %s/%s/%s while lifting its lightness",
    (red, green, blue, expected) => {
      expect(
        extractDominantColors(pixels([10, red, green, blue, 255])),
      ).toEqual([expected]);
    },
  );

  it("selects a dominant color instead of averaging opposing colors", () => {
    expect(
      extractDominantColors(
        pixels([100, 0, 255, 0, 255], [10, 255, 0, 0, 255]),
      ),
    ).toEqual(["#3dff3d", "#ff3d3d"]);
  });

  it("avoids black and white borders when a colored subject is available", () => {
    expect(
      extractDominantColors(
        pixels(
          [100, 0, 0, 0, 255],
          [100, 255, 255, 255, 255],
          [5, 0, 0, 255, 255],
        ),
      ),
    ).toEqual(["#3d3dff"]);
  });

  it("ignores transparent pixels and handles entirely transparent images", () => {
    expect(
      extractDominantColors(pixels([100, 255, 0, 0, 0], [1, 0, 255, 0, 255])),
    ).toEqual(["#3dff3d"]);
    expect(extractDominantColors(pixels([10, 255, 0, 0, 127]))).toEqual([]);
    expect(extractDominantColors(new Uint8ClampedArray())).toEqual([]);
  });

  it.each([
    [0, "#9e9e9e"],
    [128, "#9e9e9e"],
    [255, "#c7c7c7"],
  ])(
    "provides a readable neutral color for grayscale %s",
    (value, expected) => {
      expect(
        extractDominantColors(pixels([10, value, value, value, 255])),
      ).toEqual([expected]);
    },
  );

  it("weights semi-transparent samples by opacity", () => {
    expect(
      extractDominantColors(pixels([10, 255, 0, 0, 128], [8, 0, 255, 0, 255])),
    ).toEqual(["#3dff3d", "#ff3d3d"]);
  });

  it("bounds canvas sampling to 64 pixels on the long edge", () => {
    const context = {
      drawImage: vi.fn(),
      getImageData: vi.fn(() => ({ data: pixels([1, 0, 0, 255, 255]) })),
    };
    const canvas = { width: 0, height: 0, getContext: vi.fn(() => context) };
    vi.stubGlobal("document", { createElement: vi.fn(() => canvas) });
    const image = {
      naturalWidth: 1600,
      naturalHeight: 800,
    } as HTMLImageElement;
    expect(extractImageColors(image)).toEqual(["#3d3dff"]);
    expect(canvas.width).toBe(64);
    expect(canvas.height).toBe(32);
    expect(context.drawImage).toHaveBeenCalledWith(image, 0, 0, 64, 32);
  });

  it("lets image import continue if pixel access fails", () => {
    vi.stubGlobal("document", {
      createElement: () => ({
        getContext: () => {
          throw new Error("canvas unavailable");
        },
      }),
    });
    expect(
      extractImageColors({
        naturalWidth: 1,
        naturalHeight: 1,
      } as HTMLImageElement),
    ).toEqual([]);
  });

  it("extracts up to six distinct colors without inventing extra colors", () => {
    const palette = extractDominantColors(
      pixels(
        [100, 255, 0, 0, 255],
        [100, 0, 255, 0, 255],
        [100, 0, 0, 255, 255],
        [100, 255, 255, 0, 255],
        [100, 255, 0, 255, 255],
        [100, 0, 255, 255, 255],
        [100, 255, 128, 0, 255],
      ),
    );
    expect(palette).toHaveLength(6);
    expect(new Set(palette).size).toBe(6);
    expect(palette).toContain("#ff3d3d");
    expect(palette).toContain("#3dff3d");
    expect(palette).toContain("#3d3dff");
  });

  it("merges similar shades and discards tiny color noise", () => {
    expect(
      extractDominantColors(
        pixels(
          [100, 255, 0, 0, 255],
          [80, 220, 5, 5, 255],
          [1, 0, 255, 0, 255],
        ),
      ),
    ).toEqual(["#ff3d3d"]);
  });
});
