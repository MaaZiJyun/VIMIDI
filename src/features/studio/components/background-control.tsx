import { useEffect, useRef, useState } from "react";
import { PhotoIcon } from "@heroicons/react/24/outline";
import type { VisualSettings } from "../model/types";
import { loadBackgroundImage } from "../render/background";
import { extractImageColors } from "../render/extract-image-color";
import { Button, Toggle } from "./controls";

export function BackgroundControl({
  settings,
  onChange,
}: {
  settings: VisualSettings;
  onChange: (patch: Partial<VisualSettings>) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const request = useRef(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(
    () => () => {
      request.current += 1;
    },
    [],
  );

  const upload = async (file: File) => {
    const current = ++request.current;
    setLoading(true);
    setError(null);
    try {
      const backgroundImage = await loadBackgroundImage(file);
      if (
        request.current === current &&
        !input.current?.closest("fieldset")?.disabled
      ) {
        const backgroundColors = settings.backgroundAutoColor
          ? extractImageColors(backgroundImage.image)
          : [];
        onChange({
          backgroundImage,
          ...(backgroundColors.length
            ? { backgroundColors, palette: "image", globalColor: null }
            : {}),
        });
        if (settings.backgroundAutoColor && !backgroundColors.length)
          setError("背景已载入，但无法提取颜色，请手动选择音符颜色。");
      }
    } catch (cause) {
      if (request.current === current)
        setError(cause instanceof Error ? cause.message : "背景图片载入失败。");
    } finally {
      if (request.current === current) setLoading(false);
    }
  };

  return (
    <div className="background-control" aria-busy={loading}>
      <span className="field-label">背景图片</span>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        aria-label="上传背景图片"
        hidden
        disabled={loading}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void upload(file);
        }}
      />
      <div className="background-actions">
        <Button disabled={loading} onClick={() => input.current?.click()}>
          <PhotoIcon />
          {loading
            ? "载入中…"
            : settings.backgroundImage
              ? "替换背景图片"
              : "上传背景图片"}
        </Button>
        {settings.backgroundImage && (
          <button
            type="button"
            className="text-button"
            disabled={loading}
            onClick={() => {
              setError(null);
              onChange({ backgroundImage: null });
            }}
          >
            恢复默认背景
          </button>
        )}
      </div>
      <p className="background-hint" title={settings.backgroundImage?.name}>
        {settings.backgroundImage?.name ??
          "JPG / PNG / WebP，最大 20 MB，仅在本地处理。"}
      </p>
      <fieldset className="background-color-toggle" disabled={loading}>
        <Toggle
          label="从背景提取音符颜色"
          checked={settings.backgroundAutoColor}
          onChange={(backgroundAutoColor) => {
            const backgroundColors =
              backgroundAutoColor && settings.backgroundImage
                ? extractImageColors(settings.backgroundImage.image)
                : [];
            setError(
              backgroundAutoColor &&
                settings.backgroundImage &&
                !backgroundColors.length
                ? "无法提取颜色，请手动选择音符颜色。"
                : null,
            );
            onChange({
              backgroundAutoColor,
              ...(backgroundColors.length
                ? { backgroundColors, palette: "image", globalColor: null }
                : {}),
            });
          }}
        />
      </fieldset>
      {error && (
        <p className="background-error" role="alert">
          {error}
        </p>
      )}
      {settings.backgroundImage && (
        <label className="range-field">
          <span>
            背景压暗{" "}
            <output>{Math.round(settings.backgroundDim * 100)}%</output>
          </span>
          <input
            aria-label="背景压暗"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={settings.backgroundDim}
            onChange={(event) =>
              onChange({ backgroundDim: Number(event.target.value) })
            }
          />
        </label>
      )}
    </div>
  );
}
