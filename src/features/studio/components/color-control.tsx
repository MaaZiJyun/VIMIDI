import type { VisualSettings } from "../model/types";

export function ColorControl({
  settings,
  onChange,
}: {
  settings: VisualSettings;
  onChange: (patch: Partial<VisualSettings>) => void;
}) {
  return (
    <div className="global-color-control">
      <label htmlFor="global-note-color">
        <span>全局音符颜色</span>
        <small>
          {settings.globalColor ? "已统一所有音轨" : "选择后统一所有音轨"}
        </small>
      </label>
      <input
        id="global-note-color"
        aria-label="全局音符颜色"
        type="color"
        value={settings.globalColor ?? "#a575ff"}
        onChange={(event) => onChange({ globalColor: event.target.value })}
      />
      {settings.globalColor && (
        <button
          className="text-button"
          onClick={() => onChange({ globalColor: null })}
        >
          恢复分轨
        </button>
      )}
    </div>
  );
}
