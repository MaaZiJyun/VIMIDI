"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  ArrowDownTrayIcon,
  CheckCircleIcon,
  MoonIcon,
  MusicalNoteIcon,
  SunIcon,
} from "@heroicons/react/24/outline";
import { ImportPanel } from "./components/import-panel";
import { VisualPanel } from "./components/visual-panel";
import { PreviewCanvas } from "./components/preview-canvas";
import { TransportBar } from "./components/transport-bar";
import { ExportPanel } from "./components/export-panel";
import { TrackPanel } from "./components/track-panel";
import { Button, IconButton } from "./components/controls";
import { useProject } from "./hooks/use-project";
import { useTransport } from "./hooks/use-transport";
import { useExport } from "./hooks/use-export";
import { DEFAULT_EXPORT, DEFAULT_VISUALS, formatTime } from "./model/settings";
import type { ExportSettings, VisualSettings } from "./model/types";
import { supportsDirectSave } from "./export/output-target";
import { CaptionPanel } from "./components/caption-panel";
import { AutoBpmPanel } from "./components/auto-bpm-panel";
import { useAutoBpm } from "./hooks/use-auto-bpm";
import { bpmAtTime, beatToTime, timeToBeat } from "./tempo/tempo-map";
import { MidiTempoPanel } from "./components/midi-tempo-panel";

const subscribe = () => () => {};

export function Studio() {
  const source = useProject();
  const transport = useTransport(source.audio);
  const exporter = useExport();
  const autoBpm = useAutoBpm(source.audio, source.project);
  const playbackProject = autoBpm.project;
  const [visuals, setVisuals] = useState<VisualSettings>(DEFAULT_VISUALS);
  const [exportOptions, setExportOptions] = useState<Partial<ExportSettings>>(
    {},
  );
  const [dark, setDark] = useState(false);
  const directSave = useSyncExternalStore(
    subscribe,
    supportsDirectSave,
    () => false,
  );
  const ready = !!source.project && !!source.audio;
  const duration = source.audio?.duration ?? 0;
  const settings: ExportSettings = {
    ...DEFAULT_EXPORT,
    end: Math.min(30, duration),
    ...exportOptions,
  };
  const locked = !!exporter.progress;
  const bpm = playbackProject
    ? bpmAtTime(transport.time - visuals.offset, playbackProject.tempoMap)
    : 120;
  const midiTime =
    source.project && playbackProject && playbackProject !== source.project
      ? beatToTime(
          timeToBeat(transport.time - visuals.offset, playbackProject.tempoMap),
          source.project.tempoMap,
        )
      : transport.time - visuals.offset;
  const exportReady =
    ready &&
    !source.busy &&
    !autoBpm.analyzing &&
    !(autoBpm.enabled && autoBpm.error);
  const updateVisuals = useCallback(
    (patch: Partial<VisualSettings>) =>
      setVisuals((previous) => ({ ...previous, ...patch })),
    [],
  );
  const updateExport = (patch: Partial<ExportSettings>) => {
    exporter.clear();
    setExportOptions((previous) => ({ ...previous, ...patch }));
  };
  const prepareImport = () => {
    transport.pause();
    exporter.clear();
    setExportOptions({});
    setVisuals((previous) => ({ ...previous, hiddenTracks: [], offset: 0 }));
  };
  const startExport = () => {
    if (!playbackProject || !source.audio || !exportReady) return;
    transport.pause();
    void exporter.start(playbackProject, source.audio, visuals, settings);
  };
  const errors = [source.error, transport.error, exporter.error].filter(
    Boolean,
  );
  const mismatch = ready && Math.abs(source.project!.duration - duration) > 2;

  return (
    <div className="studio-app" data-o-theme={dark ? "dark" : "light"}>
      <header className="app-header">
        <Link className="brand" href="/" aria-label="VIMIDI 首页">
          <span className="brand-mark" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
            <i />
          </span>
          <strong>
            vimidi<span>.</span>
          </strong>
          <span className="brand-label">STUDIO</span>
        </Link>
        <div className="header-divider" />
        <span className="header-title">音乐可视化工作台</span>
        <div className="header-actions">
          <span className="local-badge">
            <span />
            本地工作区
          </span>
          <IconButton
            label={dark ? "切换浅色模式" : "切换深色模式"}
            onClick={() => setDark(!dark)}
          >
            {dark ? <SunIcon /> : <MoonIcon />}
          </IconButton>
        </div>
      </header>
      <main className="studio-main">
        <div className="workspace-heading">
          <div>
            <p className="eyebrow">YOUR MUSIC, IN MOTION</p>
            <h1>把声音，变成看得见的旋律。</h1>
            <p>一份 MIDI，一段音频。让音乐拥有自己的画面。</p>
          </div>
          <Button
            disabled={!ready || locked}
            onClick={() =>
              document
                .getElementById("export-panel")
                ?.scrollIntoView({ behavior: "smooth", block: "center" })
            }
          >
            <ArrowDownTrayIcon />
            导出视频
          </Button>
        </div>
        {errors.length > 0 && (
          <div className="error-banner" role="alert">
            {errors.join(" ")}
          </div>
        )}
        <div className="workspace-grid">
          <aside className="settings-column" aria-label="素材和样式设置">
            <ImportPanel
              project={source.project}
              audio={source.audio}
              midiName={source.midiName}
              busy={source.busy}
              locked={locked}
              onImport={(files) => {
                prepareImport();
                void source.importFiles(files);
              }}
              onExample={() => {
                prepareImport();
                void source.loadExample();
              }}
              onReset={() => {
                prepareImport();
                source.reset();
              }}
            />
            <fieldset className="visual-fieldset" disabled={locked}>
              <VisualPanel settings={visuals} onChange={updateVisuals} />
            </fieldset>
            <fieldset
              className="tempo-fieldset"
              disabled={locked || !ready || source.busy}
            >
              <AutoBpmPanel
                enabled={autoBpm.enabled}
                analyzing={autoBpm.analyzing}
                progress={autoBpm.progress}
                segments={autoBpm.segments}
                error={autoBpm.error}
                bpm={bpm}
                onChange={(enabled) => {
                  transport.pause();
                  exporter.clear();
                  autoBpm.setEnabled(enabled);
                }}
                onRetry={autoBpm.retry}
              />
            </fieldset>
            <fieldset className="caption-fieldset" disabled={locked}>
              <CaptionPanel
                settings={visuals}
                name={source.project?.name ?? ""}
                onChange={updateVisuals}
              />
            </fieldset>
          </aside>
          <section className="preview-column" aria-label="可视化工作区">
            <div className="panel preview-panel">
              <div className="preview-header">
                <div>
                  <span className="preview-status-dot" />
                  <h2>画面预览</h2>
                  <span className="tag">LIVE</span>
                </div>
                <div className="aspect-options" aria-label="画面比例">
                  {(["16:9", "9:16", "1:1"] as const).map((aspect) => (
                    <button
                      key={aspect}
                      disabled={locked}
                      aria-pressed={visuals.aspect === aspect}
                      onClick={() => updateVisuals({ aspect })}
                    >
                      {aspect}
                    </button>
                  ))}
                </div>
              </div>
              <PreviewCanvas
                project={playbackProject}
                settings={visuals}
                time={transport.time}
              />
              <TransportBar
                playing={transport.playing}
                time={source.audio ? transport.time : 0}
                position={transport.position}
                seeking={transport.seeking}
                duration={duration}
                volume={transport.volume}
                disabled={!ready || locked || source.busy}
                onToggle={() => void transport.toggle()}
                onSeek={transport.seek}
                onVolume={transport.setVolume}
                onScrubStart={transport.beginScrub}
                onScrubEnd={transport.endScrub}
              />
            </div>
            <div className="preview-caption">
              <span>
                <CheckCircleIcon />
                预览与导出使用相同画面
              </span>
              <span>空格 播放 / 暂停</span>
            </div>
            {source.project && (
              <div className="project-stats">
                <div>
                  <span>音符</span>
                  <strong>
                    {source.project.notes.length.toLocaleString()}
                  </strong>
                </div>
                <div>
                  <span>音轨</span>
                  <strong>{source.project.tracks.length}</strong>
                </div>
                <div>
                  <span>
                    {autoBpm.segments.length
                      ? "动态速度 · AUTO"
                      : "MIDI 当前速度"}
                  </span>
                  <strong>
                    {bpm.toFixed(3)} <small>BPM</small>
                  </strong>
                </div>
                <div>
                  <span>音频总时长</span>
                  <strong>{formatTime(duration, true)}</strong>
                </div>
              </div>
            )}
            {source.project && (
              <MidiTempoPanel
                project={source.project}
                time={midiTime}
                overridden={autoBpm.segments.length > 0}
              />
            )}
            {mismatch && (
              <div className="info-banner">
                <MusicalNoteIcon />
                <div>
                  <strong>MIDI 与音频时长不同</strong>
                  <p>
                    MIDI {formatTime(source.project!.duration)} / 音频{" "}
                    {formatTime(duration)}
                    。可用左侧时间偏移对齐起点，导出范围以音频为准；若速度或剪辑不同，单一偏移无法自动对齐全曲。
                  </p>
                </div>
              </div>
            )}
            <div className="below-preview">
              <ExportPanel
                settings={settings}
                duration={duration}
                time={transport.time}
                ready={!!exportReady}
                directSave={directSave}
                progress={exporter.progress}
                result={exporter.result}
                cancelled={exporter.cancelled}
                onChange={updateExport}
                onExport={startExport}
                onCancel={exporter.cancel}
              />
              {source.project ? (
                <fieldset className="track-fieldset" disabled={locked}>
                  <TrackPanel
                    project={source.project}
                    settings={visuals}
                    onChange={updateVisuals}
                  />
                </fieldset>
              ) : (
                <div className="workflow-note">
                  <span className="workflow-symbol" aria-hidden="true">
                    ♪
                  </span>
                  <h2>从音符，到你的作品。</h2>
                  <p>
                    选择配色与视觉效果，调整画面比例，
                    <br />
                    然后导出一支属于你的音乐视频。
                  </p>
                  <div>
                    <span>01 导入</span>
                    <i />
                    <span>02 预览</span>
                    <i />
                    <span>03 导出</span>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
        <footer className="app-footer">
          <span>
            VIMIDI STUDIO <i>·</i> 为每一个音符赋予形状
          </span>
          <a
            href="https://github.com/MaaZiJyun/o-ui"
            target="_blank"
            rel="noreferrer"
          >
            Design inspired by o-ui ↗
          </a>
        </footer>
      </main>
      <KeyboardShortcut
        disabled={!ready || locked || source.busy}
        onToggle={transport.toggle}
      />
    </div>
  );
}

function KeyboardShortcut({
  disabled,
  onToggle,
}: {
  disabled: boolean;
  onToggle: () => void;
}) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (
        event.code !== "Space" ||
        disabled ||
        /^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(target.tagName) ||
        target.isContentEditable
      )
        return;
      event.preventDefault();
      onToggle();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [disabled, onToggle]);
  return null;
}
