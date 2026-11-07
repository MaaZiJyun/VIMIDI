import type { AudioAsset } from "../model/types";

export interface TransportSnapshot {
  time: number;
  position: number;
  playing: boolean;
  seeking: boolean;
  buffering: boolean;
  ready: boolean;
  error: string | null;
}

export const EMPTY_TRANSPORT: TransportSnapshot = {
  time: 0,
  position: 0,
  playing: false,
  seeking: false,
  buffering: false,
  ready: false,
  error: null,
};

/** Audio owns the committed clock. A requested seek is only a pending thumb position. */
export class MediaTransport {
  private snapshot: TransportSnapshot = { ...EMPTY_TRANSPORT };
  private pending: number | null = null;
  private wanted = false;
  private scrubbing = false;
  private disposed = false;
  private operation = 0;
  private frame = 0;
  private timeout: ReturnType<typeof setTimeout> | undefined;
  private cleanups: (() => void)[] = [];

  constructor(
    private readonly asset: AudioAsset,
    private readonly notify: (value: TransportSnapshot) => void,
    private readonly audio: HTMLAudioElement = new Audio(),
  ) {
    this.bind("loadedmetadata", () => {
      this.update({ ready: true, error: null });
      if (this.pending !== null) this.applySeek();
      else this.commitClock();
    });
    this.bind("seeked", () => this.finishSeek());
    this.bind("playing", () => {
      if (this.wanted && this.pending === null && !this.scrubbing) {
        this.update({ buffering: false });
        this.startClock();
      }
    });
    this.bind("waiting", () => {
      this.stopClock();
      if (this.wanted) this.update({ buffering: true });
    });
    this.bind("pause", () => {
      this.stopClock();
      if (this.pending === null && !this.audio.seeking) this.commitClock();
    });
    this.bind("timeupdate", () => {
      if (this.pending === null && !this.audio.seeking && !this.scrubbing)
        this.commitClock();
    });
    this.bind("ended", () => {
      this.wanted = false;
      this.stopClock();
      this.commitClock();
      this.update({ playing: false, buffering: false });
    });
    this.bind("error", () => {
      this.wanted = false;
      this.stopClock();
      this.clearSeekTimeout();
      this.pending = null;
      this.update({
        playing: false,
        seeking: false,
        buffering: false,
        error: "音频读取或播放失败，请重新导入文件。",
      });
    });
    audio.preload = "metadata";
    audio.src = asset.url;
  }

  getSnapshot = () => this.snapshot;

  private bind(name: keyof HTMLMediaElementEventMap, callback: () => void) {
    this.audio.addEventListener(name, callback);
    this.cleanups.push(() => this.audio.removeEventListener(name, callback));
  }

  private update(patch: Partial<TransportSnapshot>) {
    if (this.disposed) return;
    this.snapshot = { ...this.snapshot, ...patch };
    this.notify(this.snapshot);
  }

  private commitClock() {
    if (
      this.pending !== null ||
      this.audio.seeking ||
      !Number.isFinite(this.audio.currentTime)
    )
      return;
    const time = Math.max(
      0,
      Math.min(this.asset.duration, this.audio.currentTime),
    );
    this.update({ time, position: time });
  }

  private startClock() {
    this.stopClock();
    const tick = () => {
      if (
        this.disposed ||
        !this.wanted ||
        this.scrubbing ||
        this.pending !== null ||
        this.audio.paused
      )
        return;
      if (!this.audio.seeking && this.audio.readyState >= 2) this.commitClock();
      this.frame = requestAnimationFrame(tick);
    };
    this.frame = requestAnimationFrame(tick);
  }

  private stopClock() {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
  }
  private clearSeekTimeout() {
    if (this.timeout) clearTimeout(this.timeout);
    this.timeout = undefined;
  }

  private applySeek() {
    if (this.pending === null || this.audio.readyState < 1) return;
    // The browser may deliver events from an earlier seek; finishSeek checks the latest request.
    try {
      this.audio.currentTime = this.pending;
    } catch {
      this.failSeek("无法跳转到该位置，请等待音频加载后重试。");
    }
  }

  private failSeek(error: string) {
    this.pending = null;
    this.wanted = false;
    this.clearSeekTimeout();
    this.update({
      position: this.snapshot.time,
      seeking: false,
      playing: false,
      buffering: false,
      error,
    });
  }

  private finishSeek() {
    if (this.pending === null || this.audio.seeking) return;
    if (Math.abs(this.audio.currentTime - this.pending) > 0.05) {
      this.applySeek();
      return;
    }
    this.pending = null;
    this.clearSeekTimeout();
    this.commitClock();
    this.update({ seeking: false, buffering: false });
    if (this.wanted && !this.scrubbing) void this.resume();
  }

  seek = (value: number) => {
    if (this.disposed || !Number.isFinite(value)) return;
    this.operation++;
    this.stopClock();
    this.pending = Math.max(0, Math.min(value, this.asset.duration));
    this.audio.pause();
    this.update({
      position: this.pending,
      seeking: true,
      buffering: false,
      error: null,
    });
    this.clearSeekTimeout();
    this.timeout = setTimeout(
      () => this.failSeek("音频定位超时，请重试或检查文件是否可读取。"),
      15000,
    );
    this.applySeek();
  };

  private async resume() {
    const operation = ++this.operation;
    try {
      await this.audio.play();
    } catch {
      if (
        this.disposed ||
        operation !== this.operation ||
        !this.wanted ||
        this.pending !== null ||
        this.scrubbing
      )
        return;
      this.wanted = false;
      this.update({
        playing: false,
        buffering: false,
        error: "无法开始播放，请检查浏览器的音频播放权限后重试。",
      });
    }
  }

  toggle = async () => {
    if (this.disposed) return;
    if (this.wanted) {
      this.pause();
      return;
    }
    this.wanted = true;
    this.update({ playing: true, error: null });
    if (this.audio.ended) {
      this.seek(0);
      return;
    }
    if (this.pending === null && !this.scrubbing) await this.resume();
  };

  pause = () => {
    this.operation++;
    this.wanted = false;
    this.stopClock();
    this.audio.pause();
    this.commitClock();
    this.update({ playing: false, buffering: false });
  };

  beginScrub = () => {
    this.scrubbing = true;
    this.operation++;
    this.stopClock();
    this.audio.pause();
  };
  endScrub = () => {
    this.scrubbing = false;
    if (this.wanted && this.pending === null) void this.resume();
  };
  setVolume = (value: number) => {
    this.audio.volume = Math.max(0, Math.min(1, value));
  };

  dispose() {
    this.disposed = true;
    this.operation++;
    this.stopClock();
    this.clearSeekTimeout();
    this.cleanups.forEach((cleanup) => cleanup());
    this.cleanups = [];
    this.audio.pause();
    this.audio.removeAttribute("src");
    this.audio.load();
  }
}
