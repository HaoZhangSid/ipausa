import { categoryMeta, categoryOrder } from "../lib/phonemes";
import type { PhonemeCategory, PhonemeEntry } from "../types";

interface QuickIndexProps {
  entries: PhonemeEntry[];
  activeId: string;
  onJump: (id: string) => void;
  selectedCategory: PhonemeCategory | "all";
}

export default function QuickIndex({
  entries,
  activeId,
  onJump,
  selectedCategory,
}: QuickIndexProps) {
  return (
    <div className="glass rounded-[28px] border border-[var(--line)] p-4">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">
          Chỉ mục dính
        </div>
        <h2 className="mt-1 text-2xl font-semibold text-[var(--ink)]">Bảng IPA nhanh</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">
          Chọn trực tiếp ký hiệu để nhảy đến section tương ứng. Trạng thái sáng là section đang ở vùng nhìn chính.
        </p>
      </div>

      <div className="mt-4 rounded-[22px] border border-[var(--line)] bg-white/72 p-3 text-sm text-[var(--ink-soft)]">
        Bộ lọc hiện tại:{" "}
        <strong className="text-[var(--ink)]">
          {selectedCategory === "all" ? "Tất cả" : categoryMeta[selectedCategory].label}
        </strong>
      </div>

      <div className="mt-4 space-y-4">
        {categoryOrder.map((category) => {
          const group = entries.filter((entry) => entry.category === category);
          if (!group.length) {
            return null;
          }

          return (
            <section key={category}>
              <div className="mb-2 flex items-center justify-between">
                <div className="text-sm font-semibold text-[var(--ink)]">{categoryMeta[category].label}</div>
                <div className={`rounded-full px-2.5 py-1 text-xs font-semibold ${categoryMeta[category].chipClass}`}>
                  {group.length}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2">
                {group.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => onJump(entry.id)}
                    className={`rounded-[18px] border px-3 py-3 text-left transition ${
                      entry.id === activeId
                        ? "border-transparent bg-[var(--ink)] text-white shadow-[0_18px_30px_rgba(31,28,23,0.18)]"
                        : "border-[var(--line)] bg-white/82 text-[var(--ink)] hover:bg-white"
                    }`}
                  >
                    <div className="display-serif text-2xl leading-none">{entry.symbol}</div>
                    <div className={`mt-2 text-xs ${entry.id === activeId ? "text-white/72" : "text-[var(--ink-soft)]"}`}>
                      {entry.keyword}
                    </div>
                  </button>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
