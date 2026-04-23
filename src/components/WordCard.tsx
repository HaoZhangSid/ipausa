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
        className={`flex h-24 items-center justify-center rounded-[20px] bg-gradient-to-br text-4xl ${visual.panel}`}
      >
        <div className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl ${visual.badge}`}>
          {visual.icon}
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h4 className="text-lg font-semibold text-[var(--ink)]">{example.word}</h4>
            <p className="mt-1 text-sm text-[var(--ink-soft)]">{example.ipa}</p>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${visual.badge}`}>
            {example.iconKey}
          </span>
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
