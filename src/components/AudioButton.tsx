import { FaPause, FaPlay, FaVolumeHigh } from "react-icons/fa6";

interface AudioButtonProps {
  label: string;
  path: string;
  trackLabel: string;
  activeAudioPath: string | null;
  isAudioPlaying: boolean;
  onPlay: (path: string, trackLabel: string) => void;
  compact?: boolean;
}

export default function AudioButton({
  label,
  path,
  trackLabel,
  activeAudioPath,
  isAudioPlaying,
  onPlay,
  compact = false,
}: AudioButtonProps) {
  const isCurrent = activeAudioPath === path;
  const playing = isCurrent && isAudioPlaying;

  return (
    <button
      type="button"
      onClick={() => onPlay(path, trackLabel)}
      className={`inline-flex items-center gap-2 rounded-full border transition ${
        playing
          ? "border-transparent bg-[var(--accent)] text-white shadow-[0_14px_28px_rgba(198,92,59,0.28)]"
          : "border-[rgba(198,92,59,0.22)] bg-white/88 text-[var(--accent-strong)] hover:bg-white"
      } ${compact ? "px-3 py-2 text-sm" : "px-4 py-2.5 text-sm font-semibold"}`}
    >
      {playing ? <FaPause className="text-xs" /> : <FaPlay className="text-xs" />}
      <span>{label}</span>
      {!playing ? <FaVolumeHigh className="text-xs opacity-70" /> : null}
    </button>
  );
}
