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
  readonly tracks: readonly MidiTrack[];
  readonly notes: readonly MidiNote[];
  /** Monotonic end-time index for efficient overlap queries, including long notes. */
  readonly maxEnds: readonly number[];
  readonly minPitch: number;
  readonly maxPitch: number;
}

export interface AudioAsset {
  readonly name: string;
  readonly url: string;
  readonly blob?: Blob;
  readonly duration: number;
}

export type PaletteId = "orbit" | "mint" | "sunset";
export type AspectRatio = "16:9" | "9:16" | "1:1";

export interface VisualSettings {
  palette: PaletteId;
  lookAhead: number;
  glow: number;
  keyboard: boolean;
  particles: boolean;
  labels: boolean;
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
