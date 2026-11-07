import { useEffect, useRef } from "react";
import {
  ArrowsPointingOutIcon,
  MusicalNoteIcon,
} from "@heroicons/react/24/outline";
import type { MidiProject, VisualSettings } from "../model/types";
import { getDimensions } from "../model/settings";
import { drawFrame } from "../render/draw-frame";
import { IconButton } from "./controls";

interface PreviewCanvasProps {
  project: MidiProject | null;
  settings: VisualSettings;
  time: number;
}

export function PreviewCanvas({ project, settings, time }: PreviewCanvasProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const dimensions = getDimensions(settings.aspect, 720);
  useEffect(() => {
    const context = canvas.current?.getContext("2d", { alpha: false });
    if (context && project)
      drawFrame(context, {
        project,
        settings,
        time,
        width: dimensions.width,
        height: dimensions.height,
      });
  }, [project, settings, time, dimensions.width, dimensions.height]);

  return (
    <div className="preview-stage" ref={container}>
      {project ? (
        <canvas
          ref={canvas}
          width={dimensions.width}
          height={dimensions.height}
          style={{ aspectRatio: `${dimensions.width}/${dimensions.height}` }}
          aria-label="MIDI 音符可视化预览"
        />
      ) : (
        <div className="preview-empty">
          <div className="empty-note-art" aria-hidden="true">
            {Array.from({ length: 15 }, (_, index) => (
              <i
                key={index}
                style={{
                  left: `${8 + index * 6}%`,
                  height: `${30 + ((index * 37) % 90)}px`,
                  top: `${(index * 23) % 140}px`,
                  opacity: 0.2 + (index % 3) * 0.12,
                }}
              />
            ))}
          </div>
          <span className="empty-icon">
            <MusicalNoteIcon />
          </span>
          <h2>让音乐，有迹可循。</h2>
          <p>导入 MIDI 与音频，把每一个音符变成画面。</p>
          <span className="empty-hint">
            从左侧载入素材，开始你的第一段可视化
          </span>
        </div>
      )}
      <div className="preview-overlay">
        <span className="live-badge">
          <i />
          {project ? "实时预览" : "你的音乐画布"}
        </span>
        <IconButton
          label="全屏预览"
          onClick={() => {
            if (document.fullscreenElement) void document.exitFullscreen();
            else void container.current?.requestFullscreen().catch(() => {});
          }}
        >
          <ArrowsPointingOutIcon />
        </IconButton>
      </div>
    </div>
  );
}
