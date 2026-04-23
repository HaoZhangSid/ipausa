from __future__ import annotations

import argparse
import json
import re
import sys
import time
from dataclasses import dataclass
from pathlib import Path

from google.auth import default as google_auth_default
from google.cloud import texttospeech


ROOT_DIR = Path(__file__).resolve().parents[1]
CONTENT_PATH = ROOT_DIR / "content" / "phonemes.json"
DEFAULT_ENDPOINT = "us-texttospeech.googleapis.com"
DEFAULT_LANGUAGE_CODE = "en-US"
DEFAULT_MODEL = "gemini-3.1-flash-tts-preview"
DEFAULT_VOICE = "Aoede"
DEFAULT_TIMEOUT = 180
DEFAULT_RETRY_DELAYS = (2.0, 5.0)
PHONEME_TEXT_TEMPLATE = """Read the following transcript based on the audio profile and director's note.

# Audio Profile
A helpful and professional personal assistant.

# Director's note
Style: Empathetic. Pace: Natural. Accent: American (Gen).

## Scene:
IPA

## Sample Context:
International Phonetic Alphabet - American Pronunciation

## Transcript:
{symbol}"""


@dataclass(frozen=True)
class AudioTask:
    label: str
    text: str
    prompt: str
    output_path: Path
    fallback_prompts: tuple[str, ...] = ()


def load_content() -> list[dict]:
    return json.loads(CONTENT_PATH.read_text(encoding="utf-8"))


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "audio"


def resolve_client() -> tuple[texttospeech.TextToSpeechClient, str]:
    credentials, detected_project = google_auth_default(
        scopes=["https://www.googleapis.com/auth/cloud-platform"]
    )
    project = str(
        getattr(credentials, "quota_project_id", "") or detected_project or ""
    ).strip()
    if not project:
        raise RuntimeError(
            "No Google Cloud project found from ADC. Configure ADC or GOOGLE_CLOUD_PROJECT."
        )
    if hasattr(credentials, "with_quota_project"):
        credentials = credentials.with_quota_project(project)
    client = texttospeech.TextToSpeechClient(
        credentials=credentials,
        client_options={"api_endpoint": DEFAULT_ENDPOINT},
    )
    return client, project


def build_phoneme_text(symbol: str) -> str:
    return PHONEME_TEXT_TEMPLATE.format(symbol=symbol.strip())


def build_tasks(
    *,
    entries: list[dict],
    ids: set[str] | None,
    include_phonemes: bool,
    include_words: bool,
) -> list[AudioTask]:
    tasks: list[AudioTask] = []

    for entry in entries:
        entry_id = str(entry.get("id") or "").strip()
        if ids and entry_id not in ids:
            continue

        if include_phonemes:
            phoneme_audio = entry["phonemeAudio"]
            symbol = str(entry["symbol"]).strip()
            tasks.append(
                AudioTask(
                    label=f"phoneme:{entry_id}",
                    text=build_phoneme_text(symbol),
                    prompt="",
                    output_path=ROOT_DIR / "public" / Path(str(phoneme_audio["path"])),
                    fallback_prompts=(),
                )
            )

        if include_words:
            for example in entry["examples"]:
                word = str(example["word"]).strip()
                output_path = ROOT_DIR / "public" / Path(str(example["audioPath"]))
                expected_slug = slugify(word)
                expected_path = ROOT_DIR / "public" / "audio" / "words" / entry_id / f"{expected_slug}.mp3"
                if output_path != expected_path:
                    raise RuntimeError(
                        f"Audio path mismatch for {entry_id}:{word}. Expected {expected_path}, got {output_path}."
                    )
                tasks.append(
                    AudioTask(
                        label=f"word:{entry_id}:{word}",
                        text=word,
                        prompt="",
                        output_path=output_path,
                        fallback_prompts=(),
                    )
                )

    return tasks


def synthesize_mp3(
    *,
    client: texttospeech.TextToSpeechClient,
    model_name: str,
    voice_name: str,
    text: str,
    prompt: str,
) -> bytes:
    input_kwargs: dict[str, str] = {"text": text}
    if prompt.strip():
        input_kwargs["prompt"] = prompt.strip()
    response = client.synthesize_speech(
        input=texttospeech.SynthesisInput(**input_kwargs),
        voice=texttospeech.VoiceSelectionParams(
            language_code=DEFAULT_LANGUAGE_CODE,
            model_name=model_name,
            name=voice_name,
        ),
        audio_config=texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.MP3,
        ),
        retry=None,
        timeout=DEFAULT_TIMEOUT,
    )
    audio_bytes = bytes(response.audio_content or b"")
    if not audio_bytes:
        raise RuntimeError("Cloud TTS returned no audio bytes.")
    return audio_bytes


def synthesize_mp3_with_retry(
    *,
    client: texttospeech.TextToSpeechClient,
    model_name: str,
    voice_name: str,
    text: str,
    prompt: str,
    fallback_prompts: tuple[str, ...] = (),
) -> bytes:
    last_error: Exception | None = None
    prompts_to_try = (prompt, *fallback_prompts)
    for candidate_prompt in prompts_to_try:
        for delay in (0.0, *DEFAULT_RETRY_DELAYS):
            if delay:
                time.sleep(delay)
            try:
                return synthesize_mp3(
                    client=client,
                    model_name=model_name,
                    voice_name=voice_name,
                    text=text,
                    prompt=candidate_prompt,
                )
            except Exception as exc:  # pragma: no cover - runtime/network dependent
                last_error = exc
    raise RuntimeError(f"Audio synthesis failed after retries: {last_error}") from last_error


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Generate mp3 audio for the IPA teaching site using Gemini 3.1 TTS."
    )
    parser.add_argument(
        "--ids",
        help="Comma-separated phoneme ids to generate, for example: i,ih,sh",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=0,
        help="Generate only the first N tasks after filtering.",
    )
    parser.add_argument("--phonemes-only", action="store_true")
    parser.add_argument("--words-only", action="store_true")
    parser.add_argument("--force", action="store_true", help="Regenerate even if the mp3 already exists.")
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--voice", default=DEFAULT_VOICE)
    parser.add_argument(
        "--delay-ms",
        type=int,
        default=0,
        help="Optional delay between successful requests.",
    )
    args = parser.parse_args()

    if args.phonemes_only and args.words_only:
        raise SystemExit("Use either --phonemes-only or --words-only, not both.")

    entries = load_content()
    client, project = resolve_client()
    requested_ids = (
        {item.strip() for item in args.ids.split(",") if item.strip()} if args.ids else None
    )

    tasks = build_tasks(
        entries=entries,
        ids=requested_ids,
        include_phonemes=not args.words_only,
        include_words=not args.phonemes_only,
    )

    if args.limit > 0:
        tasks = tasks[: args.limit]

    generated_count = 0
    skipped_count = 0
    failed_tasks: list[str] = []

    for index, task in enumerate(tasks, start=1):
        task.output_path.parent.mkdir(parents=True, exist_ok=True)

        if task.output_path.exists() and not args.force:
            skipped_count += 1
            print(f"[{index}/{len(tasks)}] skip  {task.label} -> {task.output_path}")
            continue

        try:
            audio_bytes = synthesize_mp3_with_retry(
                client=client,
                model_name=args.model,
                voice_name=args.voice,
                text=task.text,
                prompt=task.prompt,
                fallback_prompts=task.fallback_prompts,
            )
            task.output_path.write_bytes(audio_bytes)
            generated_count += 1
            print(
                f"[{index}/{len(tasks)}] write {task.label} -> {task.output_path} ({len(audio_bytes)} bytes)"
            )
        except Exception as exc:
            failed_tasks.append(f"{task.label}: {exc}")
            print(f"[{index}/{len(tasks)}] fail  {task.label} -> {exc}")
            continue
        if args.delay_ms > 0:
            time.sleep(args.delay_ms / 1000)

    print(
        f"done project={project} model={args.model} voice={args.voice} generated={generated_count} skipped={skipped_count} failed={len(failed_tasks)}"
    )
    if failed_tasks:
        print("failed_tasks:")
        for item in failed_tasks:
            print(f" - {item}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
