import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MediaTransport,
  type TransportSnapshot,
} from "../../src/features/studio/audio/media-transport";

class FakeAudio extends EventTarget {
  private time = 0;
  paused = true;
  seeking = false;
  readyState = 1;
  ended = false;
  volume = 1;
  src = "";
  preload = "";
  plays = 0;
  requests: number[] = [];
  get currentTime() {
    return this.time;
  }
  set currentTime(time: number) {
    this.time = time;
    this.seeking = true;
    this.requests.push(time);
    this.dispatchEvent(new Event("seeking"));
  }
  finish(time: number) {
    this.time = time;
    this.seeking = false;
    this.dispatchEvent(new Event("seeked"));
  }
  tick(time: number) {
    this.time = time;
    this.dispatchEvent(new Event("timeupdate"));
  }
  async play() {
    this.paused = false;
    this.plays++;
    this.dispatchEvent(new Event("playing"));
  }
  pause() {
    this.paused = true;
    this.dispatchEvent(new Event("pause"));
  }
  removeAttribute() {
    this.src = "";
  }
  load() {}
}

function fixture() {
  vi.stubGlobal(
    "requestAnimationFrame",
    vi.fn(() => 1),
  );
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  const audio = new FakeAudio();
  const updates: TransportSnapshot[] = [];
  const transport = new MediaTransport(
    { name: "test.wav", url: "blob:test", duration: 3600 },
    (state) => updates.push(state),
    audio as unknown as HTMLAudioElement,
  );
  audio.dispatchEvent(new Event("loadedmetadata"));
  return { audio, transport, updates };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("audio-authoritative seeking", () => {
  it("holds the committed clock until native seek completion", () => {
    const { audio, transport } = fixture();
    audio.tick(12);
    transport.seek(1000);
    expect(transport.getSnapshot()).toMatchObject({
      time: 12,
      position: 1000,
      seeking: true,
    });
    audio.dispatchEvent(new Event("timeupdate"));
    expect(transport.getSnapshot().time).toBe(12);
    audio.finish(1000);
    expect(transport.getSnapshot()).toMatchObject({
      time: 1000,
      position: 1000,
      seeking: false,
      playing: false,
    });
    expect(audio.plays).toBe(0);
    transport.dispose();
  });
  it("rejects an old seek completion after a newer request", () => {
    const { audio, transport } = fixture();
    transport.seek(300);
    transport.seek(1800);
    transport.seek(1000);
    audio.finish(300);
    expect(transport.getSnapshot()).toMatchObject({
      time: 0,
      position: 1000,
      seeking: true,
    });
    expect(audio.requests[audio.requests.length - 1]).toBe(1000);
    audio.finish(1000);
    expect(transport.getSnapshot()).toMatchObject({
      time: 1000,
      position: 1000,
      seeking: false,
    });
    transport.dispose();
  });
  it("pauses audible playback while scrubbing and resumes only after release and seek completion", async () => {
    const { audio, transport } = fixture();
    await transport.toggle();
    transport.beginScrub();
    transport.seek(1000);
    audio.finish(1000);
    expect(audio.paused).toBe(true);
    expect(audio.plays).toBe(1);
    transport.endScrub();
    expect(audio.paused).toBe(false);
    expect(audio.plays).toBe(2);
    expect(transport.getSnapshot().playing).toBe(true);
    transport.dispose();
  });
  it("honors a pause issued during a pending seek", async () => {
    const { audio, transport } = fixture();
    await transport.toggle();
    transport.seek(1000);
    transport.pause();
    audio.finish(1000);
    expect(audio.paused).toBe(true);
    expect(audio.plays).toBe(1);
    expect(transport.getSnapshot().playing).toBe(false);
    transport.dispose();
  });
  it("waits for metadata before applying an early seek", () => {
    const { audio, transport } = fixture();
    audio.readyState = 0;
    transport.seek(600);
    expect(audio.requests).toEqual([]);
    audio.readyState = 1;
    audio.dispatchEvent(new Event("loadedmetadata"));
    audio.finish(600);
    expect(transport.getSnapshot().time).toBe(600);
    transport.dispose();
  });
  it("releases pending requests and listeners when the asset is removed", () => {
    const { audio, transport, updates } = fixture();
    transport.seek(1000);
    transport.dispose();
    const count = updates.length;
    audio.finish(1000);
    audio.tick(1500);
    expect(updates).toHaveLength(count);
    expect(audio.src).toBe("");
  });
});
