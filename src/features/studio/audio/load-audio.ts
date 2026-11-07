import type { AudioAsset } from "../model/types";

/** Read metadata only. Native media playback keeps long recordings compressed. */
export function inspectAudio(
  url: string,
  name: string,
  blob?: Blob,
): Promise<AudioAsset> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    const timeout = window.setTimeout(
      () => finish(new Error("音频读取超时，请检查文件后重试。")),
      20000,
    );
    const cleanup = () => {
      clearTimeout(timeout);
      audio.onloadedmetadata = null;
      audio.onerror = null;
      audio.removeAttribute("src");
      audio.load();
    };
    const finish = (error?: Error) => {
      const duration = audio.duration;
      cleanup();
      if (error) reject(error);
      else if (!Number.isFinite(duration) || duration <= 0)
        reject(new Error("音频时长无效，请选择有效的 MP3 或 WAV 文件。"));
      else resolve({ name, url, blob, duration });
    };
    audio.preload = "metadata";
    audio.onloadedmetadata = () => finish();
    audio.onerror = () =>
      finish(new Error("浏览器无法读取此音频，请选择有效的 MP3 或 WAV 文件。"));
    audio.src = url;
  });
}

export function releaseAudio(asset: AudioAsset | null): void {
  if (asset?.blob) URL.revokeObjectURL(asset.url);
}
