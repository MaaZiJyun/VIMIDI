import {
  ALL_FORMATS,
  AudioSampleSink,
  BlobSource,
  Input,
  UrlSource,
} from "mediabunny";
import type { AudioAsset, DetectedTempo } from "../model/types";
import type { BpmWorkerRequest, BpmWorkerResponse } from "./bpm.worker";

const SAMPLE_RATE = 11025;
const WINDOW_SECONDS = 12;

function detect(
  worker: Worker,
  samples: Float32Array,
  reference: number,
  signal: AbortSignal,
): Promise<BpmWorkerResponse> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      worker.removeEventListener("message", onMessage);
      worker.removeEventListener("error", onError);
      signal.removeEventListener("abort", onAbort);
    };
    const onMessage = (event: MessageEvent<BpmWorkerResponse>) => {
      cleanup();
      if (event.data.error) reject(new Error(event.data.error));
      else resolve(event.data);
    };
    const onError = () => {
      cleanup();
      reject(new Error("BPM 分析线程无法启动，请刷新页面后重试。"));
    };
    const onAbort = () => {
      cleanup();
      reject(signal.reason);
    };
    signal.throwIfAborted();
    worker.addEventListener("message", onMessage);
    worker.addEventListener("error", onError);
    signal.addEventListener("abort", onAbort, { once: true });
    const message: BpmWorkerRequest = {
      samples,
      sampleRate: SAMPLE_RATE,
      reference,
    };
    worker.postMessage(message, [samples.buffer]);
  });
}

/** Stream PCM into bounded 12-second windows; only the worker performs tempo detection. */
export async function analyzeAudioTempo(
  audio: AudioAsset,
  initialBpm: number,
  signal: AbortSignal,
  onProgress: (fraction: number) => void,
): Promise<DetectedTempo[]> {
  signal.throwIfAborted();
  const worker = new Worker(new URL("./bpm.worker.ts", import.meta.url), {
    type: "module",
  });
  const input = new Input({
    source: audio.blob ? new BlobSource(audio.blob) : new UrlSource(audio.url),
    formats: ALL_FORMATS,
  });
  const dispose = () => {
    input.dispose();
    worker.terminate();
  };
  signal.addEventListener("abort", dispose, { once: true });
  const segments: DetectedTempo[] = [];
  let buffer = new Float32Array(WINDOW_SECONDS * SAMPLE_RATE);
  let count = 0;
  let nextTime = 0;
  let windowStart = 0;
  let reference = initialBpm;
  const flush = async (end: number) => {
    signal.throwIfAborted();
    const result =
      count >= SAMPLE_RATE * 3
        ? await detect(worker, buffer.slice(0, count), reference, signal)
        : { bpm: reference, confidence: 0, detected: false };
    signal.throwIfAborted();
    segments.push({ start: windowStart, end, ...result });
    reference = result.bpm;
    windowStart = end;
    count = 0;
    buffer = new Float32Array(WINDOW_SECONDS * SAMPLE_RATE);
    onProgress(Math.min(1, end / audio.duration));
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  };
  try {
    const track = await input.getPrimaryAudioTrack();
    if (!track || !(await track.canDecode()))
      throw new Error("当前浏览器无法解码此音频进行 BPM 分析。");
    for await (const sample of new AudioSampleSink(track).samples(
      0,
      audio.duration,
    )) {
      try {
        signal.throwIfAborted();
        const decoded = sample.toAudioBuffer();
        const channels = Array.from(
          { length: decoded.numberOfChannels },
          (_, channel) => decoded.getChannelData(channel),
        );
        const end = Math.min(
          audio.duration,
          sample.timestamp + sample.duration,
        );
        // Absolute sample positions avoid rounding drift at decoder packet boundaries.
        while (nextTime < end) {
          let mono = 0;
          const index = Math.max(
            0,
            Math.min(
              decoded.length - 1,
              Math.floor((nextTime - sample.timestamp) * decoded.sampleRate),
            ),
          );
          for (const channel of channels) mono += channel[index];
          buffer[count++] = mono / channels.length;
          nextTime += 1 / SAMPLE_RATE;
          if (count === buffer.length)
            await flush(Math.min(audio.duration, windowStart + WINDOW_SECONDS));
        }
      } finally {
        sample.close();
      }
    }
    if (count) await flush(audio.duration);
    if (!segments.some((segment) => segment.detected))
      throw new Error(
        "未识别到可靠节拍，继续使用 MIDI 原始速度。可尝试节拍更清晰的音频。",
      );
    return segments;
  } catch (error) {
    signal.throwIfAborted();
    throw error;
  } finally {
    signal.removeEventListener("abort", dispose);
    dispose();
  }
}
