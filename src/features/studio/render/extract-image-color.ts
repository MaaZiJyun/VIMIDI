interface ColorBucket {
  weight: number;
  red: number;
  green: number;
  blue: number;
}

export function extractDominantColors(pixels: Uint8ClampedArray): string[] {
  const buckets = new Map<number, ColorBucket>();
  const fallback: ColorBucket = { weight: 0, red: 0, green: 0, blue: 0 };
  for (let offset = 0; offset + 3 < pixels.length; offset += 4) {
    const [red, green, blue, alpha] = pixels.subarray(offset, offset + 4);
    if (alpha < 128) continue;
    const weight = alpha / 255;
    fallback.weight += weight;
    fallback.red += red * weight;
    fallback.green += green * weight;
    fallback.blue += blue * weight;
    if (Math.max(red, green, blue) < 24 || Math.min(red, green, blue) > 235)
      continue;
    const key = ((red >> 5) << 6) | ((green >> 5) << 3) | (blue >> 5);
    const bucket = buckets.get(key) ?? { weight: 0, red: 0, green: 0, blue: 0 };
    bucket.weight += weight;
    bucket.red += red * weight;
    bucket.green += green * weight;
    bucket.blue += blue * weight;
    buckets.set(key, bucket);
  }
  if (!fallback.weight) return [];
  const ranked = [...buckets.values()]
    .map((bucket) => {
      const channels = [bucket.red, bucket.green, bucket.blue];
      const maximum = Math.max(...channels);
      const saturation = maximum
        ? (maximum - Math.min(...channels)) / maximum
        : 0;
      const score = bucket.weight * (0.5 + saturation * 0.5);
      return { bucket, score };
    })
    .sort((first, second) => second.score - first.score);
  const candidates = ranked.length
    ? ranked.map(({ bucket }) => bucket)
    : [fallback];
  const minimumWeight =
    Math.max(...candidates.map((bucket) => bucket.weight)) * 0.03;
  const selected: number[][] = [];
  for (const bucket of candidates) {
    if (bucket.weight < minimumWeight) continue;
    const color = readableColor(bucket);
    if (
      selected.some(
        (existing) =>
          color.reduce(
            (distance, channel, index) =>
              distance + (channel - existing[index]) ** 2,
            0,
          ) <
          45 ** 2,
      )
    )
      continue;
    selected.push(color);
    if (selected.length === 6) break;
  }
  return selected.map(
    (color) =>
      `#${color.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`,
  );
}

function readableColor(dominant: ColorBucket): number[] {
  const channels = [dominant.red, dominant.green, dominant.blue].map(
    (channel) => channel / dominant.weight / 255,
  );
  const maximum = Math.max(...channels);
  const minimum = Math.min(...channels);
  const lightness = (maximum + minimum) / 2;
  const targetLightness = Math.max(0.62, Math.min(0.78, lightness));
  const chroma = maximum - minimum;
  const saturation = chroma ? chroma / (1 - Math.abs(2 * lightness - 1)) : 0;
  const targetChroma = (1 - Math.abs(2 * targetLightness - 1)) * saturation;
  return channels.map((channel) => {
    const adjusted = chroma
      ? targetLightness + ((channel - lightness) / chroma) * targetChroma
      : targetLightness;
    return Math.round(Math.max(0, Math.min(1, adjusted)) * 255);
  });
}

export function extractImageColors(image: HTMLImageElement): string[] {
  try {
    const canvas = document.createElement("canvas");
    const scale = 64 / Math.max(image.naturalWidth, image.naturalHeight);
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return [];
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return extractDominantColors(
      context.getImageData(0, 0, canvas.width, canvas.height).data,
    );
  } catch {
    return [];
  }
}
