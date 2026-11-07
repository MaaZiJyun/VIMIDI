import { lightenColor } from "./note-style";
import { particleSprite } from "./particle-sprite";

interface ImpactOptions {
  x: number;
  y: number;
  age: number;
  seed: number;
  color: string;
  scale: number;
  intensity: number;
  velocity: number;
}

/** Time-derived emissions make scrubbing and offline export reproduce the same particles. */
export function drawImpact(
  ctx: CanvasRenderingContext2D,
  options: ImpactOptions,
) {
  const { x, y, age, seed, color, scale, intensity, velocity } = options;
  const approach = age < 0 ? Math.max(0, 1 + age / 0.12) : 1;
  const power = approach * (0.65 + velocity * 0.35);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const bloom = ctx.createRadialGradient(x, y, 0, x, y, 65 * scale);
  bloom.addColorStop(0, `${color}b0`);
  bloom.addColorStop(0.25, `${color}60`);
  bloom.addColorStop(1, `${color}00`);
  ctx.globalAlpha = power;
  ctx.fillStyle = bloom;
  ctx.fillRect(x - 65 * scale, y - 65 * scale, 130 * scale, 95 * scale);
  ctx.fillStyle = lightenColor(color, 0.7);
  ctx.shadowColor = color;
  ctx.shadowBlur = 22 * scale;
  ctx.beginPath();
  ctx.ellipse(
    x,
    y,
    (12 + Math.exp(-Math.max(0, age) * 12) * 12) * scale,
    3 * scale,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.shadowBlur = 0;
  const count = Math.round(28 * intensity);
  const colored = count ? particleSprite(color) : null;
  const hot = count ? particleSprite(lightenColor(color, 0.65)) : null;
  for (let index = 0; index < count; index++) {
    const random = Math.abs(Math.sin(seed * 127.1 + index * 311.7));
    const life = (Math.max(0, age) * 1.4 + index / count) % 1;
    const drift =
      Math.sin(seed * 17 + index * 7) * (35 + 30 * random) * life * scale;
    const rise = life * (65 + 95 * random) * scale;
    ctx.globalAlpha = (1 - life) ** 1.5 * power * 0.95;
    const radius = (1 - life) * (1.1 + random * 2.3) * scale;
    const sprite = index % 5 === 0 ? hot : colored;
    if (sprite)
      ctx.drawImage(
        sprite,
        x + drift - radius * 3,
        y - rise - radius * 3,
        radius * 6,
        radius * 6,
      );
    if (index % 4 === 0) {
      ctx.strokeStyle = color;
      ctx.lineWidth = scale;
      ctx.beginPath();
      ctx.moveTo(x + drift, y - rise);
      ctx.lineTo(x + drift * 0.94, y - rise + (4 + random * 8) * scale);
      ctx.stroke();
    }
  }
  ctx.restore();
}
