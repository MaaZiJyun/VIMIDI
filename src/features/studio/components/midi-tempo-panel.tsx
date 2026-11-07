import { useMemo } from "react";
import type { MidiProject } from "../model/types";
import { formatTime } from "../model/settings";
import { bpmAtTime } from "../tempo/tempo-map";
import { buildTempoCurve } from "../tempo/tempo-curve";

export function MidiTempoPanel({
  project,
  time,
  overridden,
}: {
  project: MidiProject;
  time: number;
  overridden: boolean;
}) {
  const curve = useMemo(
    () => buildTempoCurve(project.tempoMap, project.duration),
    [project],
  );
  const cursor = Math.max(0, Math.min(1000, (time / curve.duration) * 1000));
  const bpm = bpmAtTime(time, project.tempoMap);
  return (
    <section className="panel midi-tempo-panel" aria-label="MIDI 原生速度曲线">
      <div className="section-heading">
        <div>
          <h2>MIDI 原生速度曲线</h2>
          <span className="tag">SET TEMPO</span>
        </div>
        <span
          className={`tempo-source-badge ${overridden ? "is-overridden" : ""}`}
        >
          {overridden ? "音频检测已替换播放速度" : "原生速度使用中"}
        </span>
      </div>
      <div className="midi-tempo-summary">
        <span>
          {project.tempoEventCount.toLocaleString()} 条 Tempo 事件 ·{" "}
          {curve.min.toFixed(3)}–{curve.max.toFixed(3)} BPM
        </span>
        <strong data-testid="native-midi-bpm">
          {bpm.toFixed(3)} <small>BPM</small>
        </strong>
      </div>
      <p className="fine-print" data-testid="midi-total-duration">
        MIDI 音符总时长 {formatTime(project.duration, true)}
      </p>
      <figure>
        <svg
          viewBox="0 0 1000 120"
          preserveAspectRatio="none"
          className="midi-tempo-curve"
          role="img"
          aria-label={`MIDI 原始 BPM 曲线，${curve.min.toFixed(3)} 至 ${curve.max.toFixed(3)} BPM`}
        >
          <line
            x1="0"
            y1="104"
            x2="1000"
            y2="104"
            className="tempo-grid-line"
          />
          <line x1="0" y1="60" x2="1000" y2="60" className="tempo-grid-line" />
          <path
            d={curve.path}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1={cursor}
            y1="4"
            x2={cursor}
            y2="116"
            className="tempo-playhead"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <figcaption>
          <span>00:00</span>
          <span>MIDI 播放位置 {formatTime(time, true)}</span>
          <span>曲线末端 {formatTime(curve.duration)}</span>
        </figcaption>
      </figure>
      <p className="fine-print">
        直接读取 MIDI 内的变速事件；默认播放与导出遵循此曲线。Auto BPM
        开启并分析完成后，才用音频检测曲线替换它。
      </p>
    </section>
  );
}
