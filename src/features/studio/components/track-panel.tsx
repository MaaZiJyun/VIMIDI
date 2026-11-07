import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { trackColor } from "../model/settings";
import type { MidiProject, VisualSettings } from "../model/types";

export function TrackPanel({
  project,
  settings,
  onChange,
}: {
  project: MidiProject;
  settings: VisualSettings;
  onChange: (patch: Partial<VisualSettings>) => void;
}) {
  const visibleCount = project.tracks.filter(
    (track) => !settings.hiddenTracks.includes(track.id),
  ).length;
  return (
    <section className="track-panel panel">
      <div className="section-heading">
        <div>
          <h2>音轨</h2>
          <span className="tag">
            {visibleCount} / {project.tracks.length}
          </span>
        </div>
        <button
          className="text-button"
          onClick={() =>
            onChange({
              hiddenTracks: settings.hiddenTracks.length
                ? []
                : project.tracks.map((track) => track.id),
            })
          }
        >
          {settings.hiddenTracks.length ? "显示全部" : "隐藏全部"}
        </button>
      </div>
      <p className="fine-print track-note">控制音符显示，原始音频保持完整。</p>
      <div className="track-list">
        {project.tracks.map((track) => {
          const hidden = settings.hiddenTracks.includes(track.id);
          const Icon = hidden ? EyeSlashIcon : EyeIcon;
          return (
            <button
              key={track.id}
              className={`track-row ${hidden ? "is-hidden" : ""}`}
              aria-pressed={!hidden}
              aria-label={`${hidden ? "显示" : "隐藏"}音轨 ${track.name}`}
              onClick={() =>
                onChange({
                  hiddenTracks: hidden
                    ? settings.hiddenTracks.filter((id) => id !== track.id)
                    : [...settings.hiddenTracks, track.id],
                })
              }
            >
              <i
                style={{
                  background: trackColor(
                    track.id,
                    settings.palette,
                    settings.globalColor,
                  ),
                }}
              />
              <span title={track.name}>{track.name}</span>
              <small>{track.noteCount.toLocaleString()}</small>
              <Icon />
            </button>
          );
        })}
      </div>
    </section>
  );
}
