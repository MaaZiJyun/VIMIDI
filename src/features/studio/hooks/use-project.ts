"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { inspectAudio, releaseAudio } from "../audio/load-audio";
import { parseMidi } from "../midi/parse-midi";
import type { AudioAsset, MidiProject } from "../model/types";

export function useProject() {
  const [project, setProject] = useState<MidiProject | null>(null);
  const [audio, setAudio] = useState<AudioAsset | null>(null);
  const [midiName, setMidiName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentAudio = useRef<AudioAsset | null>(null);
  const generation = useRef(0);

  const replaceAudio = useCallback((next: AudioAsset | null) => {
    releaseAudio(currentAudio.current);
    currentAudio.current = next;
    setAudio(next);
  }, []);

  useEffect(
    () => () => {
      generation.current++;
      releaseAudio(currentAudio.current);
    },
    [],
  );

  const importFiles = useCallback(
    async (files: File[]) => {
      const ticket = ++generation.current;
      setBusy(true);
      setError(null);
      let created: AudioAsset | null = null;
      try {
        const midiFiles = files.filter((file) => /\.midi?$/i.test(file.name));
        const audioFiles = files.filter((file) =>
          /\.(mp3|wav)$/i.test(file.name),
        );
        if (midiFiles.length > 1 || audioFiles.length > 1)
          throw new Error("每次请选择一个 MIDI 和一个对应的 MP3 / WAV 文件。");
        if (!midiFiles.length && !audioFiles.length)
          throw new Error("请选择 .mid / .midi 和对应的 .mp3 / .wav 文件。");
        let nextProject: MidiProject | undefined;
        if (midiFiles[0]) {
          if (midiFiles[0].size > 20 * 1024 * 1024)
            throw new Error("MIDI 文件请控制在 20 MB 以内。");
          nextProject = parseMidi(
            await midiFiles[0].arrayBuffer(),
            midiFiles[0].name,
          );
        }
        if (audioFiles[0]) {
          const url = URL.createObjectURL(audioFiles[0]);
          try {
            created = await inspectAudio(
              url,
              audioFiles[0].name,
              audioFiles[0],
            );
          } catch (error) {
            URL.revokeObjectURL(url);
            throw error;
          }
        }
        if (ticket !== generation.current) {
          releaseAudio(created);
          return;
        }
        if (nextProject) {
          setProject(nextProject);
          setMidiName(midiFiles[0].name);
        }
        if (created) replaceAudio(created);
      } catch (error) {
        if (ticket === generation.current)
          setError(error instanceof Error ? error.message : "文件导入失败。");
      } finally {
        if (ticket === generation.current) setBusy(false);
      }
    },
    [replaceAudio],
  );

  const loadExample = useCallback(async () => {
    const ticket = ++generation.current;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/example?kind=midi");
      if (!response.ok)
        throw new Error("本地示例文件不存在，请使用上方按钮手动导入。");
      const name = "All Tracks in FATE OF THE TREE (Original Mix)2.0.mid";
      const next = parseMidi(await response.arrayBuffer(), name);
      const asset = await inspectAudio(
        "/api/example?kind=audio",
        "all-songs-taiki.mp3",
      );
      if (ticket !== generation.current) return;
      setProject(next);
      setMidiName(name);
      replaceAudio(asset);
    } catch (error) {
      if (ticket === generation.current)
        setError(error instanceof Error ? error.message : "示例读取失败。");
    } finally {
      if (ticket === generation.current) setBusy(false);
    }
  }, [replaceAudio]);

  const reset = useCallback(() => {
    generation.current++;
    setProject(null);
    setMidiName("");
    replaceAudio(null);
    setError(null);
    setBusy(false);
  }, [replaceAudio]);

  return {
    project,
    audio,
    midiName,
    busy,
    error,
    importFiles,
    loadExample,
    reset,
  };
}
