import type { VisualSettings } from "../model/types";
import { SectionHeading, Toggle } from "./controls";

export function CaptionPanel({
  settings,
  name,
  onChange,
}: {
  settings: VisualSettings;
  name: string;
  onChange: (patch: Partial<VisualSettings>) => void;
}) {
  return (
    <section className="panel caption-panel">
      <SectionHeading number="Aa" title="视频文字" />
      <div className="caption-fields">
        <label>
          <span>
            Header / 视频标题
            <button
              type="button"
              className="text-button"
              onClick={() => onChange({ title: null })}
            >
              使用素材名
            </button>
          </span>
          <input
            type="text"
            aria-label="视频标题"
            maxLength={180}
            value={settings.title ?? ""}
            placeholder={
              settings.title === null
                ? name || "默认使用 MIDI 名称"
                : "留空则隐藏标题"
            }
            onChange={(event) => onChange({ title: event.target.value })}
          />
        </label>
        <label>
          <span>Footer / 视频页脚</span>
          <input
            type="text"
            aria-label="视频页脚"
            maxLength={240}
            value={settings.footer}
            placeholder="留空则隐藏页脚"
            onChange={(event) => onChange({ footer: event.target.value })}
          />
        </label>
      </div>
      <Toggle
        label="页脚显示时间"
        checked={settings.timestamp}
        onChange={(timestamp) => onChange({ timestamp })}
      />
      <p className="fine-print">
        文字会同步显示在预览与导出视频中。留空可隐藏对应文字。
      </p>
    </section>
  );
}
