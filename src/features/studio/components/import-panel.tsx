import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  DocumentIcon,
  MusicalNoteIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useRef, useState, type DragEvent, type ReactNode } from "react";
import type { AudioAsset, MidiProject } from "../model/types";
import { formatTime } from "../model/settings";
import { Button, SectionHeading } from "./controls";

interface ImportPanelProps {
  project: MidiProject | null;
  audio: AudioAsset | null;
  midiName: string;
  busy: boolean;
  locked: boolean;
  onImport: (files: File[]) => void;
  onExample: () => void;
  onReset: () => void;
}

export function ImportPanel({
  project,
  audio,
  midiName,
  busy,
  locked,
  onImport,
  onExample,
  onReset,
}: ImportPanelProps) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const disabled = busy || locked;
  const drop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    if (!disabled) onImport(Array.from(event.dataTransfer.files));
  };
  return (
    <section className="panel import-panel">
      <SectionHeading number="01" title="音乐素材">
        {(project || audio) && (
          <button
            className="text-button"
            disabled={disabled}
            onClick={onReset}
            aria-label="清空素材"
          >
            <XMarkIcon />
            清空
          </button>
        )}
      </SectionHeading>
      <button
        className={`drop-zone ${dragging ? "is-dragging" : ""}`}
        disabled={disabled}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={drop}
        onClick={() => input.current?.click()}
      >
        <span className="upload-icon">
          <ArrowUpTrayIcon />
        </span>
        <strong>{busy ? "正在读取音乐…" : "把音乐放在这里"}</strong>
        <span>拖入文件，或点击选择</span>
        <small>
          <span>MIDI</span>
          <span>MP3 / WAV</span>
        </small>
      </button>
      <input
        ref={input}
        className="sr-only"
        type="file"
        accept=".mid,.midi,.mp3,.wav"
        multiple
        aria-label="导入 MIDI 和音频"
        disabled={disabled}
        onChange={(event) => {
          onImport(Array.from(event.target.files ?? []));
          event.target.value = "";
        }}
      />
      <div className="asset-list">
        <AssetRow
          icon={<DocumentIcon />}
          name={midiName || "MIDI 音符文件"}
          detail={
            project
              ? `${project.tracks.length} 轨 · ${project.notes.length.toLocaleString()} 个音符`
              : "等待导入 .mid"
          }
          ready={!!project}
        />
        <AssetRow
          icon={<MusicalNoteIcon />}
          name={audio?.name || "对应的音频文件"}
          detail={
            audio
              ? `${formatTime(audio.duration)} · 原始音轨`
              : "等待导入 .mp3 / .wav"
          }
          ready={!!audio}
        />
      </div>
      <Button
        className="example-button"
        disabled={disabled}
        onClick={onExample}
      >
        <ArrowDownTrayIcon />
        载入你的示例文件
      </Button>
      <p className="fine-print">文件仅在本地处理，无需上传。</p>
    </section>
  );
}

function AssetRow({
  icon,
  name,
  detail,
  ready,
}: {
  icon: ReactNode;
  name: string;
  detail: string;
  ready: boolean;
}) {
  return (
    <div className={`asset-row ${ready ? "is-ready" : ""}`}>
      <span className="asset-icon">{icon}</span>
      <div>
        <strong title={name}>{name}</strong>
        <small>{detail}</small>
      </div>
      <span className="status-dot" title={ready ? "已就绪" : "等待导入"} />
    </div>
  );
}
