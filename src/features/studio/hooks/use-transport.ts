"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AudioAsset } from "../model/types";
import {
  EMPTY_TRANSPORT,
  MediaTransport,
  type TransportSnapshot,
} from "../audio/media-transport";

export function useTransport(asset: AudioAsset | null) {
  const controller = useRef<MediaTransport | null>(null);
  const [state, setState] = useState<{
    asset: AudioAsset | null;
    value: TransportSnapshot;
  }>({ asset: null, value: EMPTY_TRANSPORT });
  const [volume, setVolume] = useState(0.7);

  useEffect(() => {
    if (!asset) return;
    const transport = new MediaTransport(asset, (value) =>
      setState({ asset, value }),
    );
    controller.current = transport;
    return () => {
      transport.dispose();
      if (controller.current === transport) controller.current = null;
    };
  }, [asset]);

  useEffect(() => controller.current?.setVolume(volume), [volume, asset]);

  const toggle = useCallback(async () => controller.current?.toggle(), []);
  const pause = useCallback(() => controller.current?.pause(), []);
  const seek = useCallback(
    (time: number) => controller.current?.seek(time),
    [],
  );
  const beginScrub = useCallback(() => controller.current?.beginScrub(), []);
  const endScrub = useCallback(() => controller.current?.endScrub(), []);
  const snapshot = state.asset === asset ? state.value : EMPTY_TRANSPORT;
  return {
    ...snapshot,
    volume,
    setVolume,
    toggle,
    pause,
    seek,
    beginScrub,
    endScrub,
  };
}
