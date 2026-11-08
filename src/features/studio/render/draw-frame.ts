import { trackColor } from "../model/settings";
import type { MidiNote, MidiProject, VisualSettings } from "../model/types";
import { queryNotes } from "../midi/query-notes";
import { pianoLayout, type PianoKey } from "./piano-layout";
import { noteStyle } from "./note-style";
import { drawImpact } from "./impact-effects";
import { drawCaptions } from "./draw-captions";
import { beatToTime, timeToBeat } from "../tempo/tempo-map";
import { drawBackground } from "./background";

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
  const padding = width * 0.12;
  const keys = pianoLayout(
    Math.min(21, project.minPitch),
    Math.max(108, project.maxPitch),
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
  const accent = trackColor(
    0,
    settings.palette,
    settings.globalColor,
    settings.backgroundColors,
  );
  context.save();
  drawBackground(context, settings, width, height);
  const atmosphere = context.createRadialGradient(
    width * 0.5,
    strike,
    0,
    width * 0.5,
    strike,
    height,
  );
  atmosphere.addColorStop(0, `${accent}0d`);
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
  let beat = Math.ceil(timeToBeat(midiTime, project.tempoMap));
  context.strokeStyle = "#ffffff09";
  for (let index = 0; index < 128; index++, beat++) {
    const second = beatToTime(beat, project.tempoMap);
    if (second >= midiTime + settings.lookAhead) break;
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
    const bottom = strike - (note.start - midiTime) * speed;
    const noteHeight = Math.max(5 * scale, note.duration * speed);
    const x = key.x + 1.5 * scale;
    const noteWidth = Math.max(2, key.width - 3 * scale);
    const isActive =
      note.start <= midiTime && note.start + note.duration > midiTime;
    if (isActive) active.set(note.pitch, note);
    if (bottom - noteHeight > strike) continue;
    const style = noteStyle(note.trackId, isActive, settings);
    context.fillStyle = style.fill;
    context.globalAlpha = style.opacity;
    context.shadowColor = style.color;
    context.shadowBlur = style.blur * scale;
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
  }
  context.restore();

  context.strokeStyle = `${accent}66`;
  context.shadowColor = accent;
  context.shadowBlur = 12 * settings.glow;
  context.beginPath();
  context.moveTo(0, strike);
  context.lineTo(width - padding * 2, strike);
  context.stroke();
  context.shadowBlur = 0;

  if (settings.keyboard)
    drawKeyboard(
      context,
      keys,
      active,
      strike + 2 * scale,
      Math.min(height * 0.11, width * 0.06),
      settings,
      scale,
    );
  // Merge simultaneous voices on the same key to keep dense orchestral scores responsive.
  const impacts = new Map(active);
  if (settings.particles)
    for (const note of visible) {
      if (
        note.start > midiTime &&
        note.start <= midiTime + 0.12 &&
        !impacts.has(note.pitch)
      )
        impacts.set(note.pitch, note);
    }
  for (const note of impacts.values()) {
    const age = midiTime - note.start;
    const key = byPitch.get(note.pitch);
    if (!key) continue;
    drawImpact(context, {
      x: key.x + key.width / 2,
      y: strike,
      age,
      seed: note.pitch + note.trackId * 13 + note.start,
      color: trackColor(
        note.trackId,
        settings.palette,
        settings.globalColor,
        settings.backgroundColors,
      ),
      scale,
      intensity: settings.particles ? settings.particleIntensity : 0,
      velocity: note.velocity,
    });
  }
  context.restore();

  if (settings.labels)
    drawCaptions(context, project, settings, time, width, height);
  context.restore();
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
      const tint = note
        ? trackColor(
            note.trackId,
            settings.palette,
            settings.globalColor,
            settings.backgroundColors,
          )
        : null;
      const keyLeft = key.x + scale * 0.5;
      const keyWidth = Math.max(1, key.width - scale);
      const keyHeight = height * (black ? 0.62 : 1);
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(keyLeft, y, keyWidth, keyHeight, [
        0,
        0,
        0.75 * scale,
        0.75 * scale,
      ]);
      ctx.fillStyle = tint
        ? `${tint}${black ? "52" : "45"}`
        : black
          ? "#03050a70"
          : "#eef2f514";
      ctx.fill();
      ctx.strokeStyle = tint ? `${tint}99` : "#ffffff16";
      ctx.lineWidth = 0.65 * scale;
      ctx.beginPath();
      if (tint || black) {
        ctx.moveTo(keyLeft, y + 0.5 * scale);
        ctx.lineTo(keyLeft + keyWidth, y + 0.5 * scale);
      } else {
        ctx.moveTo(keyLeft, y + scale);
        ctx.lineTo(keyLeft, y + keyHeight - scale);
      }
      ctx.stroke();
      ctx.restore();
    }
  }
}
