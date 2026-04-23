import type { ExampleWord } from "../types";
import AudioButton from "./AudioButton";
import { getIconVisual } from "../lib/iconRegistry";

interface WordCardProps {
  example: ExampleWord;
  activeAudioPath: string | null;
  isAudioPlaying: boolean;
  onPlay: (path: string, trackLabel: string) => void;
}

export default function WordCard({
  example,
  activeAudioPath,
  isAudioPlaying,
  onPlay,
}: WordCardProps) {
  const visual = getIconVisual(example.iconKey);

  return (
    <article className="rounded-[24px] border border-[var(--line)] bg-white/82 p-4 shadow-[0_12px_32px_rgba(91,72,46,0.08)]">
      <div
        className={`relative flex h-28 items-center justify-center overflow-hidden rounded-[20px] bg-gradient-to-br ${visual.panel}`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.44),transparent_58%)]" />
        <div
          className={`relative inline-flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-[24px] shadow-[0_14px_28px_rgba(73,56,34,0.08)] ${visual.badge}`}
        >
          <span className={visual.iconClass}>{visual.icon}</span>
        </div>
      </div>

      <div className="mt-4">
        <div>
          <h4 className="text-lg font-semibold text-[var(--ink)]">{example.word}</h4>
          <p className="mt-1 text-sm text-[var(--ink-soft)]">{example.ipa}</p>
        </div>
        <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">{example.meaningVi}</p>
      </div>

      <div className="mt-4">
        <AudioButton
          compact
          label="Nghe từ"
          path={example.audioPath}
          trackLabel={`${example.word} ${example.ipa}`}
          activeAudioPath={activeAudioPath}
          isAudioPlaying={isAudioPlaying}
          onPlay={onPlay}
        />
      </div>
    </article>
  );
}
