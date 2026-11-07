import { ALL_FORMATS, AudioBufferSink, Input, UrlSource } from "mediabunny";

async function decodeReference(
  url: string,
  start: number,
  duration: number,
  sampleRate: number,
) {
  const input = new Input({ source: new UrlSource(url), formats: ALL_FORMATS });
  const result = new Float32Array(Math.ceil(duration * sampleRate));
  try {
    const track = await input.getPrimaryAudioTrack();
    if (!track) throw new Error("Missing audio track");
    for await (const { buffer, timestamp } of new AudioBufferSink(
      track,
    ).buffers(start, start + duration)) {
      const channel = buffer.getChannelData(0);
      for (let index = 0; index < channel.length; index++) {
        const target = Math.round(
          (timestamp - start + index / buffer.sampleRate) * sampleRate,
        );
        if (target >= 0 && target < result.length)
          result[target] = channel[index];
      }
    }
    return result;
  } finally {
    input.dispose();
  }
}

function correlate(
  reference: Float32Array,
  recorded: Float32Array,
  rate: number,
) {
  const length = Math.min(recorded.length, Math.floor(rate * 0.7));
  let recordedPower = 0;
  for (let index = 0; index < length; index += 8)
    recordedPower += recorded[index] ** 2;
  let best = -1;
  let bestIndex = 0;
  for (let offset = 0; offset + length < reference.length; offset += 8) {
    let dot = 0;
    let power = 0;
    for (let index = 0; index < length; index += 8) {
      const value = reference[offset + index];
      dot += value * recorded[index];
      power += value * value;
    }
    const score = dot / Math.sqrt(Math.max(1e-20, power * recordedPower));
    if (score > best) {
      best = score;
      bestIndex = offset;
    }
  }
  return { score: best, offset: bestIndex / rate };
}

/** Compare decoded PCM, rather than trusting the browser's displayed currentTime. */
export async function probeNativeSeek(url: string, target: number) {
  const audio = new Audio();
  const context = new AudioContext({ sampleRate: 44100 });
  const source = context.createMediaElementSource(audio);
  const processor = context.createScriptProcessor(2048, 2, 1);
  source.connect(processor);
  processor.connect(context.destination);
  const chunks: Float32Array[] = [];
  let firstTime = 0;
  let finish: (() => void) | undefined;
  const timeout = setTimeout(() => finish?.(), 12000);
  try {
    await new Promise<void>((resolve, reject) => {
      audio.onloadedmetadata = () => resolve();
      audio.onerror = () => reject(new Error("Native metadata failed"));
      audio.src = url;
    });
    await new Promise<void>((resolve) => {
      audio.onseeked = () => resolve();
      audio.currentTime = target;
    });
    const capture = new Promise<void>((resolve) => {
      finish = resolve;
    });
    processor.onaudioprocess = (event) => {
      const data = event.inputBuffer.getChannelData(0);
      if (!chunks.length && !data.some((sample) => Math.abs(sample) > 0.00001))
        return;
      if (!chunks.length) firstTime = audio.currentTime;
      chunks.push(data.slice());
      if (chunks.length >= 24) finish?.();
    };
    await context.resume();
    await audio.play();
    await capture;
    audio.pause();
    if (chunks.length < 16) throw new Error("No usable audio captured");
    const recorded = new Float32Array(chunks.length * chunks[0].length);
    chunks.forEach((chunk, index) => recorded.set(chunk, index * chunk.length));
    const from = Math.max(0, firstTime - 3);
    const reference = await decodeReference(url, from, 7, context.sampleRate);
    const match = correlate(reference, recorded, context.sampleRate);
    return {
      target,
      nativeTime: firstTime,
      decodedTime: from + match.offset,
      error: from + match.offset - firstTime,
      score: match.score,
    };
  } finally {
    clearTimeout(timeout);
    processor.onaudioprocess = null;
    processor.disconnect();
    source.disconnect();
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    await context.close();
  }
}
