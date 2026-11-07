import {
  ArrowDownTrayIcon,
  CheckCircleIcon,
  FilmIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { formatTime } from "../model/settings";
import type { ExportProgress, ExportSettings } from "../model/types";
import { downloadVideo } from "../export/output-target";
import { Button, SectionHeading, Toggle } from "./controls";

interface ExportPanelProps {
  settings: ExportSettings;
  duration: number;
  time: number;
  ready: boolean;
  directSave: boolean;
  progress: ExportProgress | null;
  result: { url: string | null; name: string; size: number } | null;
  cancelled: boolean;
  onChange: (patch: Partial<ExportSettings>) => void;
  onExport: () => void;
  onCancel: () => void;
}

export function ExportPanel({
  settings,
  duration,
  time,
  ready,
  directSave,
  progress,
  result,
  cancelled,
  onChange,
  onExport,
  onCancel,
}: ExportPanelProps) {
  const validRange =
    Number.isFinite(settings.start) &&
    Number.isFinite(settings.end) &&
    settings.start >= 0 &&
    settings.end > settings.start &&
    settings.end <= duration;
  return (
    <section className="panel export-panel" id="export-panel">
      <SectionHeading number="03" title="导出视频">
        <FilmIcon className="muted-icon" />
      </SectionHeading>
      <fieldset disabled={!!progress}>
        <div className="two-fields">
          <label className="field-label">
            分辨率
            <select
              aria-label="分辨率"
              value={settings.resolution}
              onChange={(event) =>
                onChange({
                  resolution: Number(event.target.value) as 720 | 1080,
                })
              }
            >
              <option value="720">720p HD</option>
              <option value="1080">1080p Full HD</option>
            </select>
          </label>
          <label className="field-label">
            帧率
            <select
              aria-label="帧率"
              value={settings.fps}
              onChange={(event) =>
                onChange({ fps: Number(event.target.value) as 30 | 60 })
              }
            >
              <option value="30">30 fps</option>
              <option value="60">60 fps</option>
            </select>
          </label>
        </div>
        <div className="range-heading">
          <span className="field-label">导出区间</span>
          <div>
            <button
              className="text-button"
              disabled={!ready}
              onClick={() =>
                onChange({
                  start: Math.min(time, Math.max(0, duration - 0.1)),
                  end: Math.min(duration, time + 30),
                })
              }
            >
              当前 30 秒
            </button>
            <button
              className="text-button"
              disabled={!ready}
              onClick={() => onChange({ start: 0, end: duration })}
            >
              完整音频
            </button>
          </div>
        </div>
        <div className="two-fields time-inputs">
          <label>
            <span>起点 / 秒</span>
            <input
              aria-label="导出起点"
              type="number"
              min="0"
              max={duration}
              step="0.1"
              value={settings.start}
              onChange={(event) =>
                onChange({ start: Number(event.target.value) })
              }
            />
          </label>
          <label>
            <span>终点 / 秒</span>
            <input
              aria-label="导出终点"
              type="number"
              min="0"
              max={duration}
              step="0.1"
              value={settings.end}
              onChange={(event) =>
                onChange({ end: Number(event.target.value) })
              }
            />
          </label>
        </div>
        {directSave && (
          <Toggle
            label="直接写入磁盘"
            checked={settings.saveToDisk}
            onChange={(saveToDisk) => onChange({ saveToDisk })}
          />
        )}
        {!validRange && ready && (
          <p className="field-error">请将导出区间设在音频时长以内。</p>
        )}
      </fieldset>
      <div className="export-summary">
        <span>
          MP4 <i>·</i> H.264 + AAC
        </span>
        <span>{formatTime(Math.max(0, settings.end - settings.start))}</span>
      </div>
      {progress ? (
        <div className="export-progress" role="status">
          <div>
            <span>
              {progress.phase === "finalizing"
                ? "正在封装视频…"
                : "正在生成视频…"}
            </span>
            <strong>{Math.round(progress.fraction * 100)}%</strong>
          </div>
          <progress max="1" value={progress.fraction} aria-label="导出进度" />
          <Button onClick={onCancel}>
            <XMarkIcon />
            取消导出
          </Button>
        </div>
      ) : (
        <Button
          variant="primary"
          className="export-button"
          disabled={!ready || !validRange}
          onClick={onExport}
        >
          <ArrowDownTrayIcon />
          导出 MP4<span>↗</span>
        </Button>
      )}
      {result && (
        <div className="export-success" role="status">
          <CheckCircleIcon />
          <div>
            <strong>视频已生成</strong>
            {result.url ? (
              <button
                className="text-button"
                onClick={() => downloadVideo(result.url!, result.name)}
              >
                再次下载 · {(result.size / 1024 / 1024).toFixed(1)} MB
              </button>
            ) : (
              <span>已保存到所选位置</span>
            )}
          </div>
        </div>
      )}
      {cancelled && (
        <p className="fine-print" role="status">
          导出已取消，可调整设置后重新开始。
        </p>
      )}
      <p className="fine-print">
        首次建议导出 30 秒检查效果。长视频可直接写入磁盘。
      </p>
    </section>
  );
}
