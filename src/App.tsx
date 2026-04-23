import {
  startTransition,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  useState,
} from "react";
import type { RefObject } from "react";
import {
  FaArrowUpRightFromSquare,
  FaBarsStaggered,
  FaMagnifyingGlass,
  FaXmark,
} from "react-icons/fa6";
import PhonemeSection from "./components/PhonemeSection";
import QuickIndex from "./components/QuickIndex";
import { categoryMeta, categoryOrder, getSearchBlob, phonemes } from "./lib/phonemes";
import type { PhonemeCategory, PhonemeEntry } from "./types";

function resolveAudioUrl(path: string) {
  if (/^(https?:|blob:|data:|file:)/i.test(path)) {
    return path;
  }

  const normalized = path.replace(/\\/g, "/");
  const relative = normalized.startsWith("/") || normalized.startsWith("./")
    ? normalized
    : `./${normalized}`;

  return new URL(relative, document.baseURI).href;
}

function useSingleAudio(audioRef: RefObject<HTMLAudioElement | null>) {
  const [activePath, setActivePath] = useState<string | null>(null);
  const [activeLabel, setActiveLabel] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    const handleEnded = () => {
      setIsPlaying(false);
      setActivePath(null);
      setActiveLabel("");
    };
    const handlePause = () => {
      setIsPlaying(false);
    };
    const handlePlaying = () => {
      setIsPlaying(true);
      setErrorMessage("");
    };
    const handleError = () => {
      setIsPlaying(false);
      setActivePath(null);
      setErrorMessage("Không tải được file âm thanh. Hãy dùng thanh phát ở cuối trang để thử phát thủ công.");
    };

    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("playing", handlePlaying);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("playing", handlePlaying);
      audio.removeEventListener("error", handleError);
    };
  }, [audioRef]);

  const stop = () => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    audio.pause();
    audio.currentTime = 0;
    setIsPlaying(false);
    setActivePath(null);
    setActiveLabel("");
  };

  const play = async (path: string, trackLabel: string) => {
    const audio = audioRef.current;
    if (!audio) {
      setErrorMessage("Trình phát âm thanh chưa sẵn sàng.");
      return;
    }

    if (activePath === path) {
      stop();
      return;
    }

    const resolvedPath = resolveAudioUrl(path);
    audio.pause();
    audio.currentTime = 0;
    audio.src = resolvedPath;
    audio.load();
    setActivePath(path);
    setActiveLabel(trackLabel);
    setIsPlaying(true);
    setErrorMessage("");

    try {
      await audio.play();
    } catch {
      setIsPlaying(false);
      setErrorMessage("Trình duyệt không cho phát tự động. Hãy bấm nút play trong thanh phát ở cuối trang.");
    }
  };

  useEffect(() => {
    return () => {
      const audio = audioRef.current;
      if (!audio) {
        return;
      }
      audio.pause();
      audio.currentTime = 0;
    };
  }, [audioRef]);

  return {
    activePath,
    activeLabel,
    errorMessage,
    isPlaying,
    play,
    stop,
  };
}

function useActivePhoneme(entries: PhonemeEntry[]) {
  const [activeId, setActiveId] = useState(entries[0]?.id ?? "");

  const onIntersect = useEffectEvent((items: IntersectionObserverEntry[]) => {
    const visible = items
      .filter((item) => item.isIntersecting)
      .sort((left, right) => right.intersectionRatio - left.intersectionRatio);

    if (!visible[0]) {
      return;
    }

    const nextId = visible[0].target.getAttribute("data-phoneme-id");
    if (nextId) {
      setActiveId(nextId);
    }
  });

  useEffect(() => {
    const sections = entries
      .map((entry) => document.querySelector<HTMLElement>(`[data-phoneme-id="${entry.id}"]`))
      .filter(Boolean) as HTMLElement[];

    if (!sections.length) {
      return;
    }

    const observer = new IntersectionObserver(onIntersect, {
      rootMargin: "-16% 0px -56% 0px",
      threshold: [0.18, 0.35, 0.55],
    });

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [entries, onIntersect]);

  useEffect(() => {
    if (!entries.some((entry) => entry.id === activeId)) {
      setActiveId(entries[0]?.id ?? "");
    }
  }, [activeId, entries]);

  return { activeId, setActiveId };
}

function scrollToPhoneme(id: string) {
  const target = document.getElementById(id);
  if (!target) {
    return;
  }
  target.scrollIntoView({ behavior: "smooth", block: "start" });
  window.history.replaceState(null, "", `#${id}`);
}

export default function App() {
  const hiddenAudioId = useId();
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<PhonemeCategory | "all">("all");
  const [mobileIndexOpen, setMobileIndexOpen] = useState(false);
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  const filteredPhonemes = phonemes.filter((entry) => {
    const inCategory = selectedCategory === "all" || entry.category === selectedCategory;
    const inSearch = !deferredQuery || getSearchBlob(entry).includes(deferredQuery);
    return inCategory && inSearch;
  });

  const groupedPhonemes = categoryOrder
    .map((category) => ({
      category,
      entries: filteredPhonemes.filter((entry) => entry.category === category),
    }))
    .filter((group) => group.entries.length > 0);

  const categoryCounts = categoryOrder.reduce<Record<PhonemeCategory, number>>((result, category) => {
    result[category] = phonemes.filter((entry) => entry.category === category).length;
    return result;
  }, {} as Record<PhonemeCategory, number>);

  const { activeId, setActiveId } = useActivePhoneme(filteredPhonemes);
  const audio = useSingleAudio(audioElementRef);

  useEffect(() => {
    const handleHashJump = () => {
      const nextId = window.location.hash.replace(/^#/, "").trim();
      if (!nextId) {
        return;
      }
      const exists = phonemes.some((entry) => entry.id === nextId);
      if (!exists) {
        return;
      }
      setTimeout(() => {
        scrollToPhoneme(nextId);
        setActiveId(nextId);
      }, 80);
    };

    handleHashJump();
    window.addEventListener("hashchange", handleHashJump);
    return () => window.removeEventListener("hashchange", handleHashJump);
  }, [setActiveId]);

  useEffect(() => {
    if (!activeId) {
      return;
    }
    window.history.replaceState(null, "", `#${activeId}`);
  }, [activeId]);

  const openPhoneme = (id: string) => {
    setMobileIndexOpen(false);
    setActiveId(id);
    scrollToPhoneme(id);
  };

  return (
    <div className="grain relative overflow-x-hidden">
      <div className="mx-auto max-w-[1480px] px-4 pb-16 pt-5 sm:px-6 lg:px-8">
        <header className="rise-in relative overflow-hidden rounded-[32px] border border-[var(--line)] bg-[linear-gradient(135deg,rgba(255,249,240,0.92),rgba(252,238,221,0.88))] px-5 py-6 shadow-[var(--shadow)] sm:px-8 sm:py-8">
          <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_center,rgba(211,164,68,0.18),transparent_64%)]" />
          <div className="relative grid gap-5 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div className="space-y-4">
              <span className="inline-flex items-center rounded-full border border-[rgba(198,92,59,0.22)] bg-[rgba(198,92,59,0.1)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-strong)]">
                American English IPA
              </span>
              <div className="space-y-3">
                <h1 className="display-serif max-w-4xl text-4xl leading-tight text-[var(--ink)] sm:text-5xl lg:text-6xl">
                  Bảng IPA giọng Mỹ để dạy phát âm nhanh, trực quan và đi thẳng vào miệng lưỡi.
                </h1>
                <p className="max-w-3xl text-base leading-7 text-[var(--ink-soft)] sm:text-lg">
                  Trang này dành cho dạy học trực tiếp. Mỗi âm có nút nghe, mô tả khẩu hình bằng tiếng Việt,
                  lỗi hay gặp và 4 từ ví dụ có nghĩa, có biểu tượng, có âm thanh riêng.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="glass rounded-[24px] border border-[var(--line)] p-4">
                  <div className="text-3xl font-bold text-[var(--accent-strong)]">41</div>
                  <div className="mt-1 text-sm text-[var(--ink-soft)]">Âm cốt lõi của hệ IPA Mỹ</div>
                </div>
                <div className="glass rounded-[24px] border border-[var(--line)] p-4">
                  <div className="text-3xl font-bold text-[var(--teal)]">164</div>
                  <div className="mt-1 text-sm text-[var(--ink-soft)]">Từ ví dụ có âm thanh riêng</div>
                </div>
                <div className="glass rounded-[24px] border border-[var(--line)] p-4">
                  <div className="text-3xl font-bold text-[var(--rose)]">1</div>
                  <div className="mt-1 text-sm text-[var(--ink-soft)]">Trang tĩnh, mở ra là dạy được ngay</div>
                </div>
              </div>
            </div>
            <div className="glass rounded-[28px] border border-[var(--line)] p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                    Truy cập nhanh
                  </div>
                  <div className="mt-1 text-xl font-semibold text-[var(--ink)]">
                    Nhảy đến bất kỳ âm nào
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const firstId = filteredPhonemes[0]?.id ?? phonemes[0]?.id;
                    if (firstId) {
                      openPhoneme(firstId);
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-[rgba(198,92,59,0.22)] bg-white/70 px-4 py-2 text-sm font-semibold text-[var(--accent-strong)] transition hover:border-[var(--accent)] hover:bg-white"
                >
                  Đi đến phần đang lọc
                  <FaArrowUpRightFromSquare className="text-xs" />
                </button>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {categoryOrder.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setSelectedCategory(category)}
                    className={`rounded-[20px] border px-4 py-3 text-left transition ${
                      selectedCategory === category
                        ? `border-transparent ${categoryMeta[category].chipClass}`
                        : "border-[var(--line)] bg-white/72 text-[var(--ink)] hover:bg-white"
                    }`}
                  >
                    <div className="text-xs uppercase tracking-[0.16em] text-[var(--ink-soft)]">Danh mục</div>
                    <div className="mt-1 text-base font-semibold">{categoryMeta[category].label}</div>
                    <div className="mt-1 text-sm">{categoryCounts[category]} âm</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </header>

        <div className="sticky top-3 z-30 mt-5 flex items-center gap-3 rounded-[26px] border border-[var(--line)] bg-[rgba(255,250,241,0.9)] px-4 py-3 shadow-[var(--shadow)] backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setMobileIndexOpen(true)}
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white"
          >
            <FaBarsStaggered />
            Mở bảng IPA
          </button>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-[var(--ink)]">
              {filteredPhonemes.length} âm đang hiển thị
            </div>
            <div className="truncate text-xs text-[var(--ink-soft)]">
              Chạm để mở danh sách nhảy nhanh theo ký hiệu
            </div>
          </div>
        </div>

        <section className="mt-6 grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
          <aside className="hidden lg:block">
            <div className="sticky top-4">
              <QuickIndex
                entries={filteredPhonemes}
                activeId={activeId}
                onJump={openPhoneme}
                selectedCategory={selectedCategory}
              />
            </div>
          </aside>

          <main className="min-w-0 space-y-6">
            <div className="glass rounded-[28px] border border-[var(--line)] p-4 sm:p-5">
              <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-center">
                <div className="relative">
                  <FaMagnifyingGlass className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[var(--ink-soft)]" />
                  <input
                    value={query}
                    onChange={(event) =>
                      startTransition(() => {
                        setQuery(event.target.value);
                      })
                    }
                    placeholder="Tìm theo ký hiệu, từ ví dụ hoặc nghĩa tiếng Việt"
                    className="w-full rounded-[20px] border border-[var(--line)] bg-white/86 py-3 pl-11 pr-4 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--accent)]"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedCategory("all")}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                      selectedCategory === "all"
                        ? "border-transparent bg-[var(--ink)] text-white"
                        : "border-[var(--line)] bg-white/82 text-[var(--ink-soft)] hover:bg-white"
                    }`}
                  >
                    Tất cả 41 âm
                  </button>
                  {categoryOrder.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setSelectedCategory(category)}
                      className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                        selectedCategory === category
                          ? `border-transparent ${categoryMeta[category].chipClass}`
                          : "border-[var(--line)] bg-white/82 text-[var(--ink-soft)] hover:bg-white"
                      }`}
                    >
                      {categoryMeta[category].label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-[var(--ink-soft)]">
                <span>
                  Đang hiển thị <strong className="text-[var(--ink)]">{filteredPhonemes.length}</strong> âm
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--gold)]" />
                <span>
                  Âm đang ở giữa màn hình: <strong className="text-[var(--ink)]">#{activeId || "..."}</strong>
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--rose)]" />
                <span>Chỉ một âm thanh được phát tại một thời điểm</span>
              </div>

              {audio.errorMessage ? (
                <div className="mt-4 rounded-[20px] border border-[rgba(182,81,109,0.22)] bg-[rgba(182,81,109,0.1)] px-4 py-3 text-sm text-[var(--ink)]">
                  {audio.errorMessage}
                </div>
              ) : null}
            </div>

            {groupedPhonemes.length === 0 ? (
              <div className="glass rounded-[28px] border border-[var(--line)] p-10 text-center">
                <p className="text-2xl font-semibold text-[var(--ink)]">Không có kết quả phù hợp.</p>
                <p className="mt-3 text-[var(--ink-soft)]">
                  Hãy thử tìm theo ký hiệu IPA như <code>/æ/</code>, hoặc theo từ ví dụ như{" "}
                  <code>sheep</code>, <code>teacher</code>, <code>boat</code>.
                </p>
              </div>
            ) : (
              groupedPhonemes.map((group, groupIndex) => (
                <section key={group.category} className="space-y-4">
                  <div
                    className="rise-in flex flex-wrap items-end justify-between gap-3"
                    style={{ animationDelay: `${groupIndex * 90}ms` }}
                  >
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">
                        {group.entries.length} âm trong nhóm này
                      </div>
                      <h2 className="display-serif mt-1 text-3xl text-[var(--ink)]">
                        {categoryMeta[group.category].label}
                      </h2>
                    </div>
                    <div
                      className={`rounded-full border px-4 py-2 text-sm font-semibold ${categoryMeta[group.category].chipClass}`}
                    >
                      Bộ âm {group.category.replace("_", " ")}
                    </div>
                  </div>

                  <div className="space-y-4">
                    {group.entries.map((entry, entryIndex) => (
                      <PhonemeSection
                        key={entry.id}
                        entry={entry}
                        isActive={entry.id === activeId}
                        animationDelay={entryIndex * 45}
                        onPlay={audio.play}
                        activeAudioPath={audio.activePath}
                        isAudioPlaying={audio.isPlaying}
                      />
                    ))}
                  </div>
                </section>
              ))
            )}
          </main>
        </section>
      </div>

      {mobileIndexOpen ? (
        <div className="fixed inset-0 z-50 bg-[rgba(31,28,23,0.44)] backdrop-blur-sm lg:hidden">
          <div className="absolute inset-x-3 top-3 bottom-3 overflow-hidden rounded-[30px] border border-white/30 bg-[var(--bg-soft)] shadow-[var(--shadow)]">
            <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">
                  Jump Panel
                </div>
                <div className="text-lg font-semibold text-[var(--ink)]">Chọn âm để nhảy nhanh</div>
              </div>
              <button
                type="button"
                onClick={() => setMobileIndexOpen(false)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--line)] bg-white/80 text-[var(--ink)]"
              >
                <FaXmark />
              </button>
            </div>
            <div className="h-[calc(100%-76px)] overflow-y-auto px-4 py-4">
              <QuickIndex
                entries={filteredPhonemes}
                activeId={activeId}
                onJump={openPhoneme}
                selectedCategory={selectedCategory}
              />
            </div>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="fixed bottom-4 right-4 z-30 hidden rounded-full border border-[rgba(198,92,59,0.22)] bg-[rgba(255,250,241,0.9)] px-4 py-3 text-sm font-semibold text-[var(--accent-strong)] shadow-[var(--shadow)] backdrop-blur sm:inline-flex"
      >
        Lên đầu trang
      </button>

      <div
        className={`fixed inset-x-3 bottom-3 z-40 rounded-[24px] border border-[var(--line)] bg-[rgba(255,250,241,0.96)] p-3 shadow-[var(--shadow)] backdrop-blur transition sm:inset-x-auto sm:right-4 sm:w-[420px] ${
          audio.activePath || audio.errorMessage
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-6 opacity-0"
        }`}
      >
          <div className="mb-2 flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">
                Audio Dock
              </div>
              <div className="mt-1 text-sm font-semibold text-[var(--ink)]">
                {audio.activeLabel || "Âm thanh hiện tại"}
              </div>
            </div>
            <button
              type="button"
              onClick={audio.stop}
              className="rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--ink-soft)]"
            >
              Dừng
            </button>
          </div>

          <audio
            id={hiddenAudioId}
            ref={audioElementRef}
            preload="none"
            controls
            playsInline
            className="w-full"
          />

          {audio.errorMessage ? (
            <div className="mt-2 text-xs leading-5 text-[var(--ink-soft)]">
              {audio.errorMessage}
            </div>
          ) : null}
        </div>
    </div>
  );
}
