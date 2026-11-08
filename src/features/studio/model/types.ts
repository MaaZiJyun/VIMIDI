export interface MidiNote {
  readonly pitch: number;
  readonly start: number;
  readonly duration: number;
  readonly velocity: number;
  readonly trackId: number;
}

export interface MidiTrack {
  readonly id: number;
  readonly name: string;
  readonly instrument: string;
  readonly noteCount: number;
}

export interface MidiProject {
  readonly name: string;
  readonly duration: number;
  readonly bpm: number;
  readonly tempoMap: readonly TempoPoint[];
  readonly tempoEventCount: number;
  readonly tracks: readonly MidiTrack[];
  readonly notes: readonly MidiNote[];
  /** Monotonic end-time index for efficient overlap queries, including long notes. */
  readonly maxEnds: readonly number[];
  readonly minPitch: number;
  readonly maxPitch: number;
}

/** Seconds and cumulative quarter-note beats at a tempo change. */
export interface TempoPoint {
  readonly time: number;
  readonly beat: number;
  readonly bpm: number;
}

export interface DetectedTempo {
  readonly start: number;
  readonly end: number;
  readonly bpm: number;
  readonly confidence: number;
  readonly detected: boolean;
}

export interface AudioAsset {
  readonly name: string;
  readonly url: string;
  readonly blob?: Blob;
  readonly duration: number;
}

export type PaletteId = "orbit" | "mint" | "sunset" | "image";
export type AspectRatio = "16:9" | "9:16" | "1:1";

export interface BackgroundImageAsset {
  readonly name: string;
  readonly image: HTMLImageElement;
}

export interface VisualSettings {
  backgroundImage: BackgroundImageAsset | null;
  backgroundDim: number;
  backgroundAutoColor: boolean;
  backgroundColors: string[];
  palette: PaletteId;
  globalColor: string | null;
  lookAhead: number;
  glow: number;
  keyboard: boolean;
  particles: boolean;
  particleIntensity: number;
  labels: boolean;
  title: string | null;
  footer: string;
  timestamp: boolean;
  offset: number;
  hiddenTracks: number[];
  aspect: AspectRatio;
}

export interface ExportSettings {
  resolution: 720 | 1080;
  fps: 30 | 60;
  start: number;
  end: number;
  saveToDisk: boolean;
}

export interface ExportProgress {
  phase: "encoding" | "finalizing";
  fraction: number;
}
