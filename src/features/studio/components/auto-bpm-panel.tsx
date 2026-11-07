import type { DetectedTempo } from "../model/types";
import { formatTime } from "../model/settings";
import { Button, SectionHeading, Toggle } from "./controls";

interface AutoBpmPanelProps {
  enabled: boolean;
  analyzing: boolean;
  progress: number;
  segments: readonly DetectedTempo[];
  error: string | null;
  bpm: number;
  onChange: (value: boolean) => void;
  onRetry: () => void;
}

export function AutoBpmPanel({
  enabled,
  analyzing,
  progress,
  segments,
  error,
  bpm,
  onChange,
  onRetry,
}: AutoBpmPanelProps) {
  const values = segments.map((segment) => segment.bpm);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const path = segments
    .map(
      (segment, index) =>
        `${index ? "L" : "M"}${(segment.start / segments[segments.length - 1].end) * 240},${56 - ((segment.bpm - min) / Math.max(20, max - min)) * 42} H${(segment.end / segments[segments.length - 1].end) * 240}`,
    )
    .join(" ");
  return (
    <section className="panel auto-bpm-panel">
      <SectionHeading number="♫" title="节拍同步">
        <span className="tag">BPM DETECTOR</span>
      </SectionHeading>
      <Toggle label="Auto BPM" checked={enabled} onChange={onChange} />
      <p className="fine-print">
        MIDI 原生变速默认已生效。此开关每 12
        秒识别一段音频速度，用它替换原生曲线并应用到 MIDI
        音符时间。原音频保持原速，时间偏移仍可用于校准起点。
      </p>
      {enabled && (
        <div className="bpm-status" role="status" data-testid="auto-bpm-status">
          {analyzing ? (
            <>
              <div>
                正在分析动态 BPM… <strong>{Math.floor(progress * 100)}%</strong>
              </div>
              <progress aria-label="BPM 分析进度" value={progress} max="1" />
              <p>
                长音频按段分析，可关闭开关取消。完成后即可按新节拍预览和导出。
              </p>
            </>
          ) : error ? (
            <>
              <p className="field-error">{error}</p>
              <p>本次未应用 Auto BPM；关闭开关可按 MIDI 原速度导出。</p>
              <Button onClick={onRetry}>重新分析</Button>
            </>
          ) : segments.length > 0 ? (
            <>
              <div>
                <span>动态 BPM 已应用</span>
                <strong>{bpm.toFixed(1)} BPM</strong>
              </div>
              <svg
                viewBox="0 0 240 64"
                className="bpm-curve"
                role="img"
                aria-label={`动态速度曲线 ${min.toFixed(1)} 至 ${max.toFixed(1)} BPM`}
              >
                <path
                  d={path}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </svg>
              <small>
                {min.toFixed(1)}–{max.toFixed(1)} BPM ·{" "}
                {segments.filter((segment) => segment.detected).length}/
                {segments.length} 段检测到节拍
              </small>
              <details>
                <summary>查看分段结果</summary>
                <div className="bpm-segment-list">
                  {segments.map((segment) => (
                    <div key={segment.start}>
                      <span>
                        {formatTime(segment.start)}–{formatTime(segment.end)}
                      </span>
                      <strong>{segment.bpm.toFixed(1)}</strong>
                      <small>
                        {segment.detected
                          ? `${Math.round(segment.confidence * 100)}%`
                          : "沿用前段"}
                      </small>
                    </div>
                  ))}
                </div>
              </details>
              <p>
                节拍不清晰的段落沿用前段速度；半拍 /
                倍拍可能影响识别，可关闭后恢复原 MIDI 时间。
              </p>
            </>
          ) : (
            <p>导入 MIDI 和音频后开始分析。</p>
          )}
        </div>
      )}
    </section>
  );
}
