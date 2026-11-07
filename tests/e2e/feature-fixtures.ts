import ToneMidi from "@tonejs/midi";
import { musicFixtures } from "./fixtures";

export function visualFixtures() {
  const files = musicFixtures();
  const midi = new ToneMidi.Midi(files[0].buffer);
  const track = midi.addTrack();
  track.name = "Second Track";
  track.addNote({ midi: 72, time: 0, duration: 2, velocity: 1 });
  files[0].buffer = Buffer.from(midi.toArray());
  return files;
}

export function tempoFixtures(silent = false) {
  const duration = silent ? 4 : 48;
  const files = musicFixtures(duration);
  const wav = files[1].buffer;
  wav.fill(0, 44);
  if (!silent) {
    const rate = 44100;
    for (const [start, end, bpm] of [
      [0, 24, 120],
      [24, 48, 150],
    ]) {
      for (let beat = start; beat < end - 0.01; beat += 60 / bpm) {
        const first = Math.round(beat * rate);
        for (
          let index = 0;
          index < rate * 0.08 && first + index < duration * rate;
          index++
        ) {
          const value =
            Math.sin((index * 2 * Math.PI * 180) / rate) *
            Math.exp(-index / (rate * 0.015));
          wav.writeInt16LE(Math.round(value * 28000), 44 + (first + index) * 2);
        }
      }
    }
  }
  return files;
}
