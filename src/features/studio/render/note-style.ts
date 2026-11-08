import { trackColor } from "../model/settings";
import type { VisualSettings } from "../model/types";

export function lightenColor(color: string, amount: number): string {
  const channels = [1, 3, 5].map((offset) => {
    const channel = parseInt(color.slice(offset, offset + 2), 16);
    return Math.round(channel + (255 - channel) * amount)
      .toString(16)
      .padStart(2, "0");
  });
  return `#${channels.join("")}`;
}

/** Uniform fill over the full note; only contact state changes its brightness. */
export function noteStyle(
  trackId: number,
  active: boolean,
  settings: VisualSettings,
) {
  const color = trackColor(
    trackId,
    settings.palette,
    settings.globalColor,
    settings.backgroundColors,
  );
  return {
    color,
    fill: active ? lightenColor(color, 0.32) : color,
    opacity: active ? 1 : 0.38,
    blur: (active ? 46 : 4) * settings.glow,
  };
}
