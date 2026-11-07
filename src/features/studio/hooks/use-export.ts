"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AudioAsset,
  ExportProgress,
  ExportSettings,
  MidiProject,
  VisualSettings,
} from "../model/types";
import { downloadVideo } from "../export/output-target";
import { exportVideo } from "../export/export-video";

export function useExport() {
  const controller = useRef<AbortController | null>(null);
  const resultUrl = useRef<string | null>(null);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    url: string | null;
    name: string;
    size: number;
  } | null>(null);
  const [cancelled, setCancelled] = useState(false);

  useEffect(
    () => () => {
      controller.current?.abort();
      if (resultUrl.current) URL.revokeObjectURL(resultUrl.current);
    },
    [],
  );

  const start = useCallback(
    async (
      project: MidiProject,
      audio: AudioAsset,
      visuals: VisualSettings,
      settings: ExportSettings,
    ) => {
      if (controller.current) return;
      const abort = new AbortController();
      controller.current = abort;
      setError(null);
      setResult(null);
      setCancelled(false);
      if (resultUrl.current) {
        URL.revokeObjectURL(resultUrl.current);
        resultUrl.current = null;
      }
      setProgress({ phase: "encoding", fraction: 0 });
      try {
        const blob = await exportVideo({
          project,
          audio,
          visuals,
          settings,
          signal: abort.signal,
          onProgress: setProgress,
        });
        const url = blob ? URL.createObjectURL(blob) : null;
        resultUrl.current = url;
        const name = project.name.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_");
        setResult({ url, name, size: blob?.size ?? 0 });
        if (url) downloadVideo(url, name);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError")
          setCancelled(true);
        else
          setError(
            error instanceof Error ? error.message : "视频导出失败，请重试。",
          );
      } finally {
        controller.current = null;
        setProgress(null);
      }
    },
    [],
  );

  const cancel = useCallback(() => controller.current?.abort(), []);
  const clear = useCallback(() => {
    setResult(null);
    setError(null);
    setCancelled(false);
  }, []);
  return { progress, error, result, cancelled, start, cancel, clear };
}
