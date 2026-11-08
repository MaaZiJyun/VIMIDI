import { PALETTES } from "../model/settings";
import type { PaletteId, VisualSettings } from "../model/types";
import { SectionHeading, Toggle } from "./controls";
import { ColorControl } from "./color-control";
import { BackgroundControl } from "./background-control";

interface VisualPanelProps {
  settings: VisualSettings;
  onChange: (patch: Partial<VisualSettings>) => void;
}

export function VisualPanel({ settings, onChange }: VisualPanelProps) {
  return (
    <section className="panel visual-panel">
      <SectionHeading number="02" title="视觉样式">
        <span className="tag">钢琴瀑布</span>
      </SectionHeading>
      <BackgroundControl settings={settings} onChange={onChange} />
      <label className="field-label">音符配色</label>
      <div className="palette-options">
        {Object.entries(PALETTES).map(([id, palette]) => (
          <button
            key={id}
            className={`palette-option ${settings.palette === id && !settings.globalColor ? "is-selected" : ""}`}
            aria-pressed={settings.palette === id && !settings.globalColor}
            onClick={() =>
              onChange({ palette: id as PaletteId, globalColor: null })
            }
          >
            <span className="palette-dots">
              {palette.colors.slice(0, 4).map((color) => (
                <i key={color} style={{ background: color }} />
              ))}
            </span>
            <span>{palette.name}</span>
          </button>
        ))}
      </div>
      {settings.backgroundColors.length > 0 && (
        <button
          type="button"
          className={`palette-option image-palette-option ${settings.palette === "image" && !settings.globalColor ? "is-selected" : ""}`}
          aria-label="使用背景配色"
          aria-pressed={settings.palette === "image" && !settings.globalColor}
          onClick={() => onChange({ palette: "image", globalColor: null })}
        >
          <span className="palette-dots" aria-hidden="true">
            {settings.backgroundColors.map((color) => (
              <i key={color} style={{ background: color }} title={color} />
            ))}
          </span>
          <span>背景配色 · {settings.backgroundColors.length} 色</span>
        </button>
      )}
      <ColorControl settings={settings} onChange={onChange} />
      <label className="range-field">
        <span>
          可视时间窗 <output>{settings.lookAhead.toFixed(1)} 秒</output>
        </span>
        <input
          aria-label="可视时间窗"
          type="range"
          min="2"
          max="10"
          step="0.5"
          value={settings.lookAhead}
          onChange={(event) =>
            onChange({ lookAhead: Number(event.target.value) })
          }
        />
      </label>
      <label className="range-field">
        <span>
          辉光强度 <output>{Math.round(settings.glow * 100)}%</output>
        </span>
        <input
          aria-label="辉光强度"
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={settings.glow}
          onChange={(event) => onChange({ glow: Number(event.target.value) })}
        />
      </label>
      <div className="toggle-list">
        <Toggle
          label="显示钢琴键盘"
          checked={settings.keyboard}
          onChange={(keyboard) => onChange({ keyboard })}
        />
        <Toggle
          label="音符粒子"
          checked={settings.particles}
          onChange={(particles) => onChange({ particles })}
        />
        <Toggle
          label="显示标题与页脚"
          checked={settings.labels}
          onChange={(labels) => onChange({ labels })}
        />
      </div>
      <label className="range-field">
        <span>
          粒子强度 <output>{settings.particleIntensity.toFixed(1)}×</output>
        </span>
        <input
          aria-label="粒子强度"
          type="range"
          min="0.5"
          max="2.5"
          step="0.1"
          value={settings.particleIntensity}
          disabled={!settings.particles}
          onChange={(event) =>
            onChange({ particleIntensity: Number(event.target.value) })
          }
        />
      </label>
      <div className="offset-control">
        <div>
          <label htmlFor="midi-offset">MIDI 时间偏移</label>
          <small>正值让音符延后出现</small>
        </div>
        <div>
          <input
            id="midi-offset"
            type="number"
            min="-3600"
            max="3600"
            step="0.1"
            value={settings.offset}
            onChange={(event) => {
              const value = Number(event.target.value);
              if (Number.isFinite(value))
                onChange({ offset: Math.max(-3600, Math.min(3600, value)) });
            }}
          />
          <span>秒</span>
        </div>
      </div>
    </section>
  );
}
