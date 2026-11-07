export interface PianoKey {
  pitch: number;
  black: boolean;
  x: number;
  width: number;
}

const BLACK = new Set([1, 3, 6, 8, 10]);

export function pianoLayout(
  min: number,
  max: number,
  width: number,
): PianoKey[] {
  let whiteCount = 0;
  for (let pitch = min; pitch <= max; pitch++)
    if (!BLACK.has(pitch % 12)) whiteCount++;
  const whiteWidth = width / Math.max(1, whiteCount);
  let whiteIndex = 0;
  return Array.from({ length: max - min + 1 }, (_, index) => {
    const pitch = min + index;
    const black = BLACK.has(pitch % 12);
    const key = {
      pitch,
      black,
      x: black ? (whiteIndex - 0.3) * whiteWidth : whiteIndex * whiteWidth,
      width: whiteWidth * (black ? 0.6 : 1),
    };
    if (!black) whiteIndex++;
    return key;
  });
}
