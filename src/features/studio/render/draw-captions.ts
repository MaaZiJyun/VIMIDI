import { formatTime } from "../model/settings";
import type { MidiProject, VisualSettings } from "../model/types";

export function drawCaptions(
  ctx: CanvasRenderingContext2D,
  project: MidiProject,
  settings: VisualSettings,
  time: number,
  width: number,
  height: number,
) {
  const scale = height / 720;
  const padding = width * 0.045;
  ctx.save();
  ctx.textAlign = "left";
  ctx.fillStyle = "#fafafa";
  ctx.font = `500 ${18 * scale}px system-ui, sans-serif`;
  ctx.fillText(
    settings.title ?? project.name,
    padding,
    height * 0.075,
    width - padding * 2,
  );
  ctx.fillStyle = "#a1a1aa";
  ctx.font = `${10 * scale}px system-ui, sans-serif`;
  ctx.fillText(
    settings.footer,
    padding,
    height * 0.95,
    width - padding * 2 - (settings.timestamp ? 90 * scale : 0),
  );
  if (settings.timestamp) {
    ctx.textAlign = "right";
    ctx.fillText(formatTime(time), width - padding, height * 0.95);
  }
  ctx.restore();
}
