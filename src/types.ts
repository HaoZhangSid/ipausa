export type PhonemeCategory =
  | "monophthong"
  | "r_colored"
  | "diphthong"
  | "consonant";

export interface ArticulationInfo {
  lips: string;
  tongue: string;
  jaw: string;
  airflow: string;
  voicing: string;
}

export interface PhonemeAudioConfig {
  text: string;
  prompt: string;
  path: string;
}

export interface ExampleWord {
  word: string;
  ipa: string;
  meaningVi: string;
  iconKey: string;
  audioPath: string;
}

export interface PhonemeEntry {
  id: string;
  symbol: string;
  category: PhonemeCategory;
  keyword: string;
  overviewVi: string;
  articulation: ArticulationInfo;
  commonMistakeVi: string;
  phonemeAudio: PhonemeAudioConfig;
  examples: ExampleWord[];
}
