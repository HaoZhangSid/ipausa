import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const phonemesPath = path.join(rootDir, "content", "phonemes.json");
const iconRegistryPath = path.join(rootDir, "content", "icon-registry.json");

const allowedCategories = new Set(["monophthong", "r_colored", "diphthong", "consonant"]);
const allowedIconKinds = new Set([
  "animal",
  "clothing",
  "food",
  "health",
  "home",
  "music",
  "nature",
  "object",
  "person",
  "place",
  "school",
  "tech",
  "toy",
  "transport",
  "weather",
]);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function expectString(value, label, issues) {
  if (typeof value !== "string" || !value.trim()) {
    issues.push(`${label} must be a non-empty string.`);
  }
}

function expectArray(value, label, issues) {
  if (!Array.isArray(value)) {
    issues.push(`${label} must be an array.`);
  }
}

const phonemes = readJson(phonemesPath);
const iconRegistry = readJson(iconRegistryPath);
const issues = [];

if (!Array.isArray(phonemes)) {
  issues.push("content/phonemes.json must export an array.");
}

for (const [key, kind] of Object.entries(iconRegistry)) {
  if (!allowedIconKinds.has(kind)) {
    issues.push(`icon-registry key "${key}" uses unsupported icon kind "${kind}".`);
  }
}

if (phonemes.length !== 41) {
  issues.push(`Expected 41 phonemes, found ${phonemes.length}.`);
}

const seenIds = new Set();
const seenSymbols = new Set();

phonemes.forEach((entry, index) => {
  const base = `phonemes[${index}]`;
  expectString(entry.id, `${base}.id`, issues);
  expectString(entry.symbol, `${base}.symbol`, issues);
  expectString(entry.keyword, `${base}.keyword`, issues);
  expectString(entry.overviewVi, `${base}.overviewVi`, issues);
  expectString(entry.commonMistakeVi, `${base}.commonMistakeVi`, issues);

  if (!allowedCategories.has(entry.category)) {
    issues.push(`${base}.category must be one of ${Array.from(allowedCategories).join(", ")}.`);
  }

  if (seenIds.has(entry.id)) {
    issues.push(`${base}.id "${entry.id}" is duplicated.`);
  }
  seenIds.add(entry.id);

  if (seenSymbols.has(entry.symbol)) {
    issues.push(`${base}.symbol "${entry.symbol}" is duplicated.`);
  }
  seenSymbols.add(entry.symbol);

  if (!entry.articulation || typeof entry.articulation !== "object") {
    issues.push(`${base}.articulation must be an object.`);
  } else {
    for (const field of ["lips", "tongue", "jaw", "airflow", "voicing"]) {
      expectString(entry.articulation[field], `${base}.articulation.${field}`, issues);
    }
  }

  if (!entry.phonemeAudio || typeof entry.phonemeAudio !== "object") {
    issues.push(`${base}.phonemeAudio must be an object.`);
  } else {
    expectString(entry.phonemeAudio.text, `${base}.phonemeAudio.text`, issues);
    expectString(entry.phonemeAudio.prompt, `${base}.phonemeAudio.prompt`, issues);
    expectString(entry.phonemeAudio.path, `${base}.phonemeAudio.path`, issues);

    if (entry.phonemeAudio.path !== `audio/phonemes/${entry.id}.mp3`) {
      issues.push(
        `${base}.phonemeAudio.path must equal audio/phonemes/${entry.id}.mp3, got ${entry.phonemeAudio.path}.`,
      );
    }
  }

  expectArray(entry.examples, `${base}.examples`, issues);
  if (Array.isArray(entry.examples)) {
    if (entry.examples.length !== 4) {
      issues.push(`${base}.examples must contain exactly 4 items.`);
    }

    entry.examples.forEach((example, exampleIndex) => {
      const exampleBase = `${base}.examples[${exampleIndex}]`;
      expectString(example.word, `${exampleBase}.word`, issues);
      expectString(example.ipa, `${exampleBase}.ipa`, issues);
      expectString(example.meaningVi, `${exampleBase}.meaningVi`, issues);
      expectString(example.iconKey, `${exampleBase}.iconKey`, issues);
      expectString(example.audioPath, `${exampleBase}.audioPath`, issues);

      if (!(example.iconKey in iconRegistry)) {
        issues.push(`${exampleBase}.iconKey "${example.iconKey}" is not registered.`);
      }

      if (
        typeof example.audioPath === "string" &&
        !example.audioPath.startsWith(`audio/words/${entry.id}/`) &&
        !example.audioPath.startsWith(`audio/words/${entry.id.toLowerCase()}/`)
      ) {
        issues.push(`${exampleBase}.audioPath must live under audio/words/${entry.id}/.`);
      }
    });
  }
});

if (issues.length) {
  console.error("IPA content validation failed:\n");
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log(
  `IPA content validation passed: ${phonemes.length} phonemes, ${phonemes.reduce((sum, entry) => sum + entry.examples.length, 0)} examples, ${Object.keys(iconRegistry).length} icon keys.`,
);
