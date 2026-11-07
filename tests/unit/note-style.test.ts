import { describe, expect, it } from "vitest";
import {
  DEFAULT_VISUALS,
  trackColor,
} from "../../src/features/studio/model/settings";
import {
  lightenColor,
  noteStyle,
} from "../../src/features/studio/render/note-style";

describe("uniform notes and contact brightness", () => {
  it("keeps inactive notes dim and brightens the whole note at contact", () => {
    const inactive = noteStyle(0, false, DEFAULT_VISUALS);
    const active = noteStyle(0, true, DEFAULT_VISUALS);
    expect(inactive.fill).toBe(inactive.color);
    expect(inactive.opacity).toBeLessThan(active.opacity);
    expect(active.fill).toBe(lightenColor(inactive.color, 0.32));
    expect(active.blur).toBeGreaterThan(inactive.blur);
  });
  it("applies a global override to every track and restores palette colors", () => {
    const settings = { ...DEFAULT_VISUALS, globalColor: "#ff5533" };
    for (const id of [0, 1, 10, 35])
      expect(noteStyle(id, false, settings).fill).toBe("#ff5533");
    expect(trackColor(0, "orbit")).not.toBe(trackColor(1, "orbit"));
    expect(trackColor(0, "orbit", "invalid")).toBe(trackColor(0, "orbit"));
  });
});
