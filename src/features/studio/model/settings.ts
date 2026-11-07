import type {
  AspectRatio,
  ExportSettings,
  PaletteId,
  VisualSettings,
} from "./types";

export const PALETTES: Record<
  PaletteId,
  { name: string; colors: readonly string[] }
> = {
  orbit: {
    name: "轨道",
    colors: ["#a575ff", "#4eeaf6", "#ff75d1", "#7575ff", "#12e6c8", "#fbd392"],
  },
  mint: {
    name: "薄荷",
    colors: ["#12e6c8", "#75ffa5", "#4eeaf6", "#d1ff75", "#92f1e4"],
  },
  sunset: {
    name: "日落",
    colors: ["#ff6b6b", "#fda312", "#ff75d1", "#f7e545", "#fcbaba"],
  },
};

export const DEFAULT_VISUALS: VisualSettings = {
  palette: "orbit",
  globalColor: null,
  lookAhead: 5,
  glow: 0.65,
  keyboard: true,
  particles: true,
  particleIntensity: 1.4,
  labels: true,
  title: null,
  footer: "V I M I D I  /  MUSIC IN MOTION",
  timestamp: true,
  offset: 0,
  hiddenTracks: [],
  aspect: "16:9",
};

export const DEFAULT_EXPORT: ExportSettings = {
  resolution: 720,
  fps: 30,
  start: 0,
  end: 30,
  saveToDisk: false,
};

export function getDimensions(aspect: AspectRatio, resolution: number) {
  const long = Math.round((resolution * 16) / 9 / 2) * 2;
  if (aspect === "9:16") return { width: resolution, height: long };
  if (aspect === "1:1") return { width: resolution, height: resolution };
  return { width: long, height: resolution };
}

export function trackColor(
  trackId: number,
  palette: PaletteId,
  globalColor?: string | null,
): string {
  if (globalColor && /^#[0-9a-f]{6}$/i.test(globalColor)) return globalColor;
  const colors = PALETTES[palette].colors;
  return colors[trackId % colors.length];
}

export function formatTime(seconds: number, precise = false): string {
  const safe = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  const minutes = Math.floor(safe / 60)
    .toString()
    .padStart(2, "0");
  const rest = Math.floor(safe % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${rest}${precise ? `.${Math.floor((safe % 1) * 10)}` : ""}`;
}

export function validateRange(
  start: number,
  end: number,
  duration: number,
): void {
  if (
    ![start, end, duration].every(Number.isFinite) ||
    start < 0 ||
    end <= start ||
    end > duration + 0.001
  ) {
    throw new Error(
      "请设置有效的导出区间：起点须小于终点，且不能超出音频时长。",
    );
  }
}
