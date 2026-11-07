import { detectWindow } from "./detect-window";

export interface BpmWorkerRequest {
  samples: Float32Array;
  sampleRate: number;
  reference: number;
}
export interface BpmWorkerResponse {
  bpm: number;
  confidence: number;
  detected: boolean;
  error?: string;
}

const scope = self as unknown as Worker;
scope.addEventListener(
  "message",
  async (event: MessageEvent<BpmWorkerRequest>) => {
    try {
      scope.postMessage(
        await detectWindow(
          event.data.samples,
          event.data.sampleRate,
          event.data.reference,
        ),
      );
    } catch (error) {
      scope.postMessage({
        error: error instanceof Error ? error.message : "BPM 分析失败",
      });
    }
  },
);
