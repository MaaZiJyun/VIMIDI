import { formatTime, trackColor } from "../model/settings";
import type { MidiNote, MidiProject, VisualSettings } from "../model/types";
import { queryNotes } from "../midi/query-notes";
import { pianoLayout, type PianoKey } from "./piano-layout";

export interface FrameOptions {
  project: MidiProject;
  settings: VisualSettings;
  time: number;
  width: number;
  height: number;
}

export function drawFrame(
  context: CanvasRenderingContext2D,
  options: FrameOptions,
): void {
  const { project, settings, time, width, height } = options;
  const scale = height / 720;
  const padding = width * 0.045;
  const keys = pianoLayout(
    project.minPitch,
    project.maxPitch,
    width - padding * 2,
  );
  const byPitch = new Map(keys.map((key) => [key.pitch, key]));
  const strike = height * (settings.keyboard ? 0.79 : 0.9);
  const top = height * 0.13;
  const speed = (strike - top) / settings.lookAhead;
  const midiTime = time - settings.offset;
  const hidden = new Set(settings.hiddenTracks);
  const visible = queryNotes(
    project,
    midiTime - 0.7,
    midiTime + settings.lookAhead,
  ).filter((note) => !hidden.has(note.trackId));
  const active = new Map<number, MidiNote>();
  context.save();
  context.fillStyle = "#101014";
  context.fillRect(0, 0, width, height);
  const atmosphere = context.createRadialGradient(
    width * 0.5,
    strike,
    0,
    width * 0.5,
    strike,
    height,
  );
  atmosphere.addColorStop(0, "#a575ff0d");
  atmosphere.addColorStop(1, "#10101400");
  context.fillStyle = atmosphere;
  context.fillRect(0, 0, width, height);

  context.save();
  context.translate(padding, 0);
  context.strokeStyle = "#ffffff06";
  context.lineWidth = scale;
  for (const key of keys) {
    if (key.black) continue;
    context.beginPath();
    context.moveTo(key.x, top);
    context.lineTo(key.x, strike);
    context.stroke();
  }
  const beat = 60 / project.bpm;
  context.strokeStyle = "#ffffff09";
  for (
    let second = Math.ceil(midiTime / beat) * beat;
    second < midiTime + settings.lookAhead;
    second += beat
  ) {
    const y = strike - (second - midiTime) * speed;
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width - padding * 2, y);
    context.stroke();
  }

  context.save();
  context.beginPath();
  context.rect(0, top, width - padding * 2, strike - top);
  context.clip();
  for (const note of visible) {
    const key = byPitch.get(note.pitch);
    if (!key) continue;
    const color = trackColor(note.trackId, settings.palette);
    const bottom = strike - (note.start - midiTime) * speed;
    const noteHeight = Math.max(5 * scale, note.duration * speed);
    const x = key.x + 1.5 * scale;
    const noteWidth = Math.max(2, key.width - 3 * scale);
    const isActive =
      note.start <= midiTime && note.start + note.duration > midiTime;
    if (isActive) active.set(note.pitch, note);
    if (bottom - noteHeight > strike) continue;
    const gradient = context.createLinearGradient(
      0,
      bottom - noteHeight,
      0,
      bottom,
    );
    gradient.addColorStop(0, `${color}75`);
    gradient.addColorStop(1, color);
    context.fillStyle = gradient;
    context.globalAlpha = 0.5 + note.velocity * 0.5;
    context.shadowColor = color;
    context.shadowBlur = (isActive ? 26 : 12) * settings.glow * scale;
    context.beginPath();
    context.roundRect(
      x,
      bottom - noteHeight,
      noteWidth,
      noteHeight,
      Math.min(4 * scale, noteWidth / 3),
    );
    context.fill();
    context.shadowBlur = 0;
    context.fillStyle = "#ffffff45";
    context.fillRect(
      x + noteWidth * 0.15,
      bottom - noteHeight + 1,
      noteWidth * 0.7,
      scale,
    );
  }
  context.restore();

  context.strokeStyle = "#a575ff66";
  context.shadowColor = "#a575ff";
  context.shadowBlur = 12 * settings.glow;
  context.beginPath();
  context.moveTo(0, strike);
  context.lineTo(width - padding * 2, strike);
  context.stroke();
  context.shadowBlur = 0;

  for (const [pitch, note] of active) {
    const key = byPitch.get(pitch)!;
    const color = trackColor(note.trackId, settings.palette);
    const center = key.x + key.width / 2;
    const bloom = context.createRadialGradient(
      center,
      strike,
      0,
      center,
      strike,
      45 * scale,
    );
    bloom.addColorStop(0, `${color}95`);
    bloom.addColorStop(1, `${color}00`);
    context.fillStyle = bloom;
    context.fillRect(
      center - 45 * scale,
      strike - 45 * scale,
      90 * scale,
      70 * scale,
    );
    if (settings.particles)
      drawParticles(
        context,
        center,
        strike,
        midiTime - note.start,
        pitch,
        color,
        scale,
      );
  }

  if (settings.keyboard)
    drawKeyboard(
      context,
      keys,
      active,
      strike + 2 * scale,
      height * 0.1,
      settings,
      scale,
    );
  context.restore();

  if (settings.labels) {
    context.fillStyle = "#fafafa";
    context.font = `500 ${18 * scale}px system-ui, sans-serif`;
    const title =
      project.name.length > 52 ? `${project.name.slice(0, 49)}…` : project.name;
    context.fillText(title, padding, height * 0.075, width * 0.7);
    context.fillStyle = "#71717a";
    context.font = `${10 * scale}px system-ui, sans-serif`;
    context.fillText("V I M I D I  /  MUSIC IN MOTION", padding, height * 0.95);
    context.textAlign = "right";
    context.fillText(formatTime(time), width - padding, height * 0.95);
  }
  context.restore();
}

function drawParticles(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  age: number,
  seed: number,
  color: string,
  scale: number,
) {
  ctx.fillStyle = color;
  for (let index = 0; index < 7; index++) {
    const life = (age * 1.8 + index / 7) % 1;
    const drift = Math.sin(seed * 17 + index * 7) * 24 * scale * life;
    ctx.globalAlpha = (1 - life) * 0.7;
    ctx.beginPath();
    ctx.arc(
      x + drift,
      y - life * 65 * scale,
      (1 - life) * 2 * scale,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawKeyboard(
  ctx: CanvasRenderingContext2D,
  keys: PianoKey[],
  active: Map<number, MidiNote>,
  y: number,
  height: number,
  settings: VisualSettings,
  scale: number,
) {
  for (const black of [false, true]) {
    for (const key of keys) {
      if (key.black !== black) continue;
      const note = active.get(key.pitch);
      ctx.fillStyle = note
        ? trackColor(note.trackId, settings.palette)
        : black
          ? "#151519"
          : "#d4d4dc";
      const keyHeight = height * (black ? 0.62 : 1);
      ctx.beginPath();
      ctx.roundRect(
        key.x + scale * 0.5,
        y,
        Math.max(1, key.width - scale),
        keyHeight,
        [0, 0, 2 * scale, 2 * scale],
      );
      ctx.fill();
      if (!black && key.pitch % 12 === 0) {
        ctx.fillStyle = "#71717a";
        ctx.font = `${8 * scale}px system-ui`;
        ctx.textAlign = "center";
        ctx.fillText(
          `C${Math.floor(key.pitch / 12) - 1}`,
          key.x + key.width / 2,
          y + keyHeight - 8 * scale,
        );
      }
    }
  }
}
