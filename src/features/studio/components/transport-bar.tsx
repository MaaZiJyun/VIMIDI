import {
  ArrowPathIcon,
  BackwardIcon,
  ForwardIcon,
  PauseIcon,
  PlayIcon,
  SpeakerWaveIcon,
} from "@heroicons/react/24/outline";
import { formatTime } from "../model/settings";
import { IconButton } from "./controls";

interface TransportBarProps {
  playing: boolean;
  time: number;
  position: number;
  seeking: boolean;
  duration: number;
  volume: number;
  disabled: boolean;
  onToggle: () => void;
  onSeek: (time: number) => void;
  onVolume: (volume: number) => void;
  onScrubStart: () => void;
  onScrubEnd: () => void;
}

export function TransportBar({
  playing,
  time,
  position,
  seeking,
  duration,
  volume,
  disabled,
  onToggle,
  onSeek,
  onVolume,
  onScrubStart,
  onScrubEnd,
}: TransportBarProps) {
  return (
    <div className="transport">
      <input
        className="seek-bar"
        type="range"
        aria-label="播放进度"
        min="0"
        max={duration || 1}
        step="0.01"
        value={Math.min(position, duration)}
        disabled={disabled}
        onChange={(event) => onSeek(Number(event.target.value))}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          onScrubStart();
        }}
        onPointerUp={onScrubEnd}
        onPointerCancel={onScrubEnd}
        onBlur={onScrubEnd}
      />
      <div className="transport-controls">
        <div className="playback-buttons">
          <IconButton
            label="回到开头"
            disabled={disabled}
            onClick={() => onSeek(0)}
          >
            <ArrowPathIcon />
          </IconButton>
          <IconButton
            label="后退 5 秒"
            disabled={disabled}
            onClick={() => onSeek(time - 5)}
          >
            <BackwardIcon />
          </IconButton>
          <button
            className="play-button"
            aria-label={playing ? "暂停" : "播放"}
            disabled={disabled}
            onClick={onToggle}
          >
            {playing ? <PauseIcon /> : <PlayIcon />}
          </button>
          <IconButton
            label="前进 5 秒"
            disabled={disabled}
            onClick={() => onSeek(time + 5)}
          >
            <ForwardIcon />
          </IconButton>
        </div>
        <div className="time-display">
          <strong>{formatTime(time, true)}</strong>
          <span>/</span>
          {formatTime(duration)}
          {seeking && (
            <span role="status" aria-label="音频定位状态">
              定位中…
            </span>
          )}
        </div>
        <label className="volume-control">
          <SpeakerWaveIcon />
          <input
            aria-label="预览音量"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(event) => onVolume(Number(event.target.value))}
          />
        </label>
      </div>
    </div>
  );
}
