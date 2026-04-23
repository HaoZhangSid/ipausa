import phonemeData from "../../content/phonemes.json";
import type { PhonemeCategory, PhonemeEntry } from "../types";

export const phonemes = phonemeData as PhonemeEntry[];

export const categoryMeta: Record<
  PhonemeCategory,
  {
    label: string;
    chipClass: string;
    panelClass: string;
  }
> = {
  monophthong: {
    label: "Nguyên âm đơn",
    chipClass: "bg-[rgba(198,92,59,0.14)] text-[var(--accent-strong)] border-[rgba(198,92,59,0.2)]",
    panelClass: "from-[rgba(198,92,59,0.16)] to-[rgba(255,255,255,0.72)]",
  },
  r_colored: {
    label: "Âm có màu /r/",
    chipClass: "bg-[rgba(182,81,109,0.14)] text-[var(--rose)] border-[rgba(182,81,109,0.22)]",
    panelClass: "from-[rgba(182,81,109,0.16)] to-[rgba(255,255,255,0.72)]",
  },
  diphthong: {
    label: "Nguyên âm đôi",
    chipClass: "bg-[rgba(211,164,68,0.16)] text-[#8c6112] border-[rgba(211,164,68,0.24)]",
    panelClass: "from-[rgba(211,164,68,0.18)] to-[rgba(255,255,255,0.72)]",
  },
  consonant: {
    label: "Phụ âm",
    chipClass: "bg-[rgba(31,111,120,0.14)] text-[var(--teal)] border-[rgba(31,111,120,0.2)]",
    panelClass: "from-[rgba(31,111,120,0.16)] to-[rgba(255,255,255,0.72)]",
  },
};

export const categoryOrder: PhonemeCategory[] = [
  "monophthong",
  "r_colored",
  "diphthong",
  "consonant",
];

export function getSearchBlob(entry: PhonemeEntry) {
  return [
    entry.symbol,
    entry.keyword,
    entry.overviewVi,
    entry.commonMistakeVi,
    ...entry.examples.flatMap((example) => [example.word, example.ipa, example.meaningVi]),
  ]
    .join(" ")
    .toLowerCase();
}
