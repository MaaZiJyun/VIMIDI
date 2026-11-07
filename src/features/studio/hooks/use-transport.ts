"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AudioAsset } from "../model/types";

export function useTransport(asset: AudioAsset | null) {
  const element = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [error, setError] = useState<string | null>(null);
  const [loadedAsset, setLoadedAsset] = useState<AudioAsset | null>(null);

  useEffect(() => {
    if (!asset) return;
    const audio = new Audio(asset.url);
    audio.preload = "metadata";
    element.current = audio;
    const onPlay = () => setPlaying(true);
    const onPause = () => {
      setPlaying(false);
      setTime(audio.currentTime);
    };
    const onSeek = () => setTime(audio.currentTime);
    const onError = () => {
      setPlaying(false);
      setError("音频播放失败，请重新导入文件。");
    };
    const onReady = () => {
      setLoadedAsset(asset);
      setTime(audio.currentTime);
      setPlaying(!audio.paused);
      setError(null);
    };
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("seeked", onSeek);
    audio.addEventListener("ended", onPause);
    audio.addEventListener("error", onError);
    audio.addEventListener("loadedmetadata", onReady);
    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("seeked", onSeek);
      audio.removeEventListener("ended", onPause);
      audio.removeEventListener("error", onError);
      audio.removeEventListener("loadedmetadata", onReady);
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      element.current = null;
    };
  }, [asset]);

  useEffect(() => {
    if (element.current) element.current.volume = volume;
  }, [volume, asset]);

  useEffect(() => {
    if (!playing || loadedAsset !== asset) return;
    let frame = 0;
    const tick = () => {
      setTime(element.current?.currentTime ?? 0);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, loadedAsset, asset]);

  const pause = useCallback(() => element.current?.pause(), []);
  const seek = useCallback(
    (value: number) => {
      const audio = element.current;
      if (!audio || !Number.isFinite(value)) return;
      const next = Math.max(0, Math.min(value, asset?.duration ?? 0));
      audio.currentTime = next;
      setTime(next);
    },
    [asset],
  );
  const toggle = useCallback(async () => {
    const audio = element.current;
    if (!audio) return;
    setError(null);
    if (!audio.paused) {
      audio.pause();
      return;
    }
    try {
      if (audio.ended) audio.currentTime = 0;
      await audio.play();
    } catch {
      setError("无法开始播放，请检查浏览器的音频播放权限后重试。");
    }
  }, []);

  return {
    playing: loadedAsset === asset && playing,
    time: loadedAsset === asset ? time : 0,
    volume,
    error: loadedAsset === asset ? error : null,
    toggle,
    pause,
    seek,
    setVolume,
  };
}
