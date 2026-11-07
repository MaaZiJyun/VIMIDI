const sprites = new Map<string, HTMLCanvasElement | OffscreenCanvas>();

/** Cache tiny glow sprites; per-particle shadow filters stall dense scores and delay the preview. */
export function particleSprite(
  color: string,
): HTMLCanvasElement | OffscreenCanvas | null {
  const cached = sprites.get(color);
  if (cached) return cached;
  const canvas =
    typeof OffscreenCanvas !== "undefined"
      ? new OffscreenCanvas(32, 32)
      : document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext("2d") as
    CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
  if (!ctx) return null;
  const glow = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  glow.addColorStop(0, color);
  glow.addColorStop(0.22, `${color}ed`);
  glow.addColorStop(0.48, `${color}65`);
  glow.addColorStop(1, `${color}00`);
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 32, 32);
  if (sprites.size >= 64) sprites.delete(sprites.keys().next().value!);
  sprites.set(color, canvas);
  return canvas;
}
