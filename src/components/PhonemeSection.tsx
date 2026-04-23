import { categoryMeta } from "../lib/phonemes";
import type { PhonemeEntry } from "../types";
import AudioButton from "./AudioButton";
import WordCard from "./WordCard";

interface PhonemeSectionProps {
  entry: PhonemeEntry;
  isActive: boolean;
  animationDelay: number;
  onPlay: (path: string, trackLabel: string) => void;
  activeAudioPath: string | null;
  isAudioPlaying: boolean;
}

export default function PhonemeSection({
  entry,
  isActive,
  animationDelay,
  onPlay,
  activeAudioPath,
  isAudioPlaying,
}: PhonemeSectionProps) {
  const category = categoryMeta[entry.category];

  return (
    <article
      id={entry.id}
      data-phoneme-id={entry.id}
      className={`section-ring rise-in overflow-hidden rounded-[28px] border bg-gradient-to-br p-5 shadow-[var(--shadow)] transition sm:p-6 ${
        isActive
          ? `border-transparent ${category.panelClass}`
          : "border-[var(--line)] from-[rgba(255,250,241,0.9)] to-[rgba(255,255,255,0.86)]"
      }`}
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
        <div className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="display-serif rounded-[22px] bg-[rgba(255,255,255,0.7)] px-4 py-2 text-4xl text-[var(--ink)] shadow-[inset_0_0_0_1px_rgba(131,98,63,0.12)]">
                  {entry.symbol}
                </span>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">
                    Từ neo
                  </div>
                  <div className="text-lg font-semibold text-[var(--ink)]">{entry.keyword}</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${category.chipClass}`}>
                  {category.label}
                </span>
                <a
                  href={`#${entry.id}`}
                  className="rounded-full border border-[var(--line)] bg-white/76 px-3 py-1.5 text-sm text-[var(--ink-soft)] transition hover:bg-white"
                >
                  #{entry.id}
                </a>
              </div>
            </div>

            <AudioButton
              label="Nghe âm này"
              path={entry.phonemeAudio.path}
              trackLabel={`${entry.symbol} - ${entry.keyword}`}
              activeAudioPath={activeAudioPath}
              isAudioPlaying={isAudioPlaying}
              onPlay={onPlay}
            />
          </div>

          <div className="rounded-[22px] border border-[var(--line)] bg-white/76 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">
              Cách phát âm
            </div>
            <p className="mt-3 text-base leading-7 text-[var(--ink)]">{entry.overviewVi}</p>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-[22px] border border-[var(--line)] bg-white/74 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">Môi</div>
              <div className="mt-2 text-sm leading-6 text-[var(--ink)]">{entry.articulation.lips}</div>
            </div>
            <div className="rounded-[22px] border border-[var(--line)] bg-white/74 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">Lưỡi</div>
              <div className="mt-2 text-sm leading-6 text-[var(--ink)]">{entry.articulation.tongue}</div>
            </div>
            <div className="rounded-[22px] border border-[var(--line)] bg-white/74 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">Hàm</div>
              <div className="mt-2 text-sm leading-6 text-[var(--ink)]">{entry.articulation.jaw}</div>
            </div>
            <div className="rounded-[22px] border border-[var(--line)] bg-white/74 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">Luồng hơi</div>
              <div className="mt-2 text-sm leading-6 text-[var(--ink)]">{entry.articulation.airflow}</div>
            </div>
            <div className="rounded-[22px] border border-[var(--line)] bg-white/74 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">Dây thanh</div>
              <div className="mt-2 text-sm leading-6 text-[var(--ink)]">{entry.articulation.voicing}</div>
            </div>
            <div className="rounded-[22px] border border-[rgba(198,92,59,0.18)] bg-[rgba(198,92,59,0.08)] p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                Lỗi hay gặp
              </div>
              <div className="mt-2 text-sm leading-6 text-[var(--ink)]">{entry.commonMistakeVi}</div>
            </div>
          </div>
        </div>

        <div className="rounded-[24px] border border-[var(--line)] bg-[rgba(255,255,255,0.72)] p-4 sm:p-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">
                4 từ ví dụ
              </div>
              <h3 className="mt-1 text-xl font-semibold text-[var(--ink)]">Ví dụ để luyện ngay</h3>
            </div>
            <div className="rounded-full bg-[rgba(31,111,120,0.12)] px-3 py-1 text-xs font-semibold text-[var(--teal)]">
              {entry.examples.length} thẻ từ
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {entry.examples.map((example) => (
              <WordCard
                key={`${entry.id}-${example.word}`}
                example={example}
                activeAudioPath={activeAudioPath}
                isAudioPlaying={isAudioPlaying}
                onPlay={onPlay}
              />
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}
