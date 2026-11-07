import ToneMidi from "@tonejs/midi";

const { Midi } = ToneMidi;

export function musicFixtures(duration = 4) {
  const midi = new Midi();
  midi.header.setTempo(120);
  const track = midi.addTrack();
  track.name = "Test Piano";
  for (let time = 0; time < duration; time += 0.5)
    track.addNote({
      midi: 60 + ((time * 4) % 12),
      time,
      duration: 0.4,
      velocity: 0.8,
    });
  const sampleRate = 44100;
  const samples = duration * sampleRate;
  const wav = Buffer.alloc(44 + samples * 2);
  wav.write("RIFF", 0);
  wav.writeUInt32LE(wav.length - 8, 4);
  wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(sampleRate, 24);
  wav.writeUInt32LE(sampleRate * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(samples * 2, 40);
  for (let index = 0; index < samples; index++)
    wav.writeInt16LE(
      Math.round(Math.sin((index / sampleRate) * 440 * Math.PI * 2) * 6000),
      44 + index * 2,
    );
  return [
    {
      name: "test.mid",
      mimeType: "audio/midi",
      buffer: Buffer.from(midi.toArray()),
    },
    { name: "test.wav", mimeType: "audio/wav", buffer: wav },
  ];
}
