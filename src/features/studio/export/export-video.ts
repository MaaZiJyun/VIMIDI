import {
  ALL_FORMATS,
  AudioSampleSink,
  AudioSampleSource,
  BlobSource,
  CanvasSource,
  Input,
  Mp4OutputFormat,
  Output,
  UrlSource,
  canEncodeAudio,
  canEncodeVideo,
  type AudioSample,
} from "mediabunny";
import { getDimensions, validateRange } from "../model/settings";
import type {
  AudioAsset,
  ExportProgress,
  ExportSettings,
  MidiProject,
  VisualSettings,
} from "../model/types";
import { drawFrame } from "../render/draw-frame";
import { createOutputTarget } from "./output-target";

interface ExportRequest {
  project: MidiProject;
  audio: AudioAsset;
  visuals: VisualSettings;
  settings: ExportSettings;
  signal: AbortSignal;
  onProgress: (progress: ExportProgress) => void;
}

export async function exportVideo(
  request: ExportRequest,
): Promise<Blob | null> {
  const { project, audio, visuals, settings, signal, onProgress } = request;
  validateRange(settings.start, settings.end, audio.duration);
  if (!project.notes.length) throw new Error("请先导入 MIDI。");
  const duration = settings.end - settings.start;
  if (!settings.saveToDisk && duration > 600)
    throw new Error(
      "超过 10 分钟的视频请启用「直接写入磁盘」，或缩短导出区间。",
    );
  const destination = await createOutputTarget(
    project.name,
    settings.saveToDisk,
  );
  const input = new Input({
    source: audio.blob ? new BlobSource(audio.blob) : new UrlSource(audio.url),
    formats: ALL_FORMATS,
  });
  let output: Output | undefined;
  let iterator: AsyncGenerator<AudioSample, void> | undefined;
  let pending: IteratorResult<AudioSample, void> | undefined;
  let completed = false;
  try {
    signal.throwIfAborted();
    const { width, height } = getDimensions(
      visuals.aspect,
      settings.resolution,
    );
    const audioTrack = await input.getPrimaryAudioTrack();
    if (!audioTrack || !(await audioTrack.canDecode()))
      throw new Error(
        "当前浏览器无法解码此音频，请使用最新版 Chrome 或 Edge。",
      );
    const channels = await audioTrack.getNumberOfChannels();
    const sampleRate = await audioTrack.getSampleRate();
    const [videoSupported, audioSupported] = await Promise.all([
      canEncodeVideo("avc", { width, height, frameRate: settings.fps }),
      canEncodeAudio("aac", { numberOfChannels: channels, sampleRate }),
    ]);
    if (!videoSupported || !audioSupported)
      throw new Error(
        "当前浏览器不支持 H.264 / AAC 编码，请在最新版 Chrome 或 Edge 中导出 MP4。",
      );
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("无法创建视频画布。");
    const video = new CanvasSource(canvas, {
      codec: "avc",
      bitrate: settings.resolution === 1080 ? 8_000_000 : 4_000_000,
      keyFrameInterval: 2,
    });
    const sound = new AudioSampleSource({ codec: "aac", bitrate: 192_000 });
    output = new Output({
      target: destination.target,
      format: new Mp4OutputFormat({ fastStart: "fragmented" }),
    });
    output.addVideoTrack(video, { frameRate: settings.fps });
    output.addAudioTrack(sound);
    await output.start();
    iterator = new AudioSampleSink(audioTrack).samples(
      settings.start,
      settings.end,
    );
    pending = await iterator.next();
    const frameCount = Math.ceil(duration * settings.fps);
    for (let frame = 0; frame < frameCount; frame++) {
      signal.throwIfAborted();
      const timestamp = frame / settings.fps;
      const frameDuration = Math.min(1 / settings.fps, duration - timestamp);
      const absoluteEnd = settings.start + timestamp + frameDuration;
      // Interleave small audio chunks and video frames. Never decode the whole recording.
      while (!pending.done && pending.value.timestamp < absoluteEnd) {
        const sample = pending.value;
        try {
          const first = Math.max(
            0,
            Math.round((settings.start - sample.timestamp) * sample.sampleRate),
          );
          const last = Math.min(
            sample.numberOfFrames,
            Math.round((settings.end - sample.timestamp) * sample.sampleRate),
          );
          if (last > first) {
            const trimmed = sample.trim(first, last);
            try {
              trimmed.setTimestamp(
                Math.max(0, trimmed.timestamp - settings.start),
              );
              await sound.add(trimmed);
            } finally {
              trimmed.close();
            }
          }
        } finally {
          sample.close();
        }
        pending = await iterator.next();
      }
      drawFrame(context, {
        project,
        settings: visuals,
        time: settings.start + timestamp,
        width,
        height,
      });
      await video.add(timestamp, frameDuration);
      if (frame % 5 === 0)
        onProgress({ phase: "encoding", fraction: (frame + 1) / frameCount });
      if (frame % 15 === 0)
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
    video.close();
    sound.close();
    signal.throwIfAborted();
    onProgress({ phase: "finalizing", fraction: 1 });
    await output.finalize();
    signal.throwIfAborted();
    const blob = await destination.finish();
    completed = true;
    return blob;
  } finally {
    if (pending && !pending.done) pending.value.close();
    await iterator?.return();
    input.dispose();
    if (!completed) {
      await output?.cancel().catch(() => {});
      await destination.abort().catch(() => {});
    }
  }
}
