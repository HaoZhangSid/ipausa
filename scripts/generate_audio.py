from __future__ import annotations

import argparse
import json
import os
import re
import struct
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path

from google.auth import default as google_auth_default
from google import genai
from google.genai import types as genai_types
from google.cloud import texttospeech


ROOT_DIR = Path(__file__).resolve().parents[1]
CONTENT_PATH = ROOT_DIR / "content" / "phonemes.json"
ENV_PATH = ROOT_DIR / ".env"
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
    backend: str = "cloud_tts"
    fallback_prompts: tuple[str, ...] = ()


def load_content() -> list[dict]:
    return json.loads(CONTENT_PATH.read_text(encoding="utf-8"))


def load_local_env() -> None:
    if not ENV_PATH.exists():
        return
    for raw_line in ENV_PATH.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


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


def resolve_genai_client() -> tuple[genai.Client, str]:
    api_key = str(os.environ.get("GEMINI_API_KEY") or "").strip()
    if api_key:
        return genai.Client(api_key=api_key), "gemini_api_key"

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
    client = genai.Client(
        vertexai=True,
        credentials=credentials,
        project=project,
        location="global",
    )
    return client, project


def build_phoneme_text(symbol: str) -> str:
    return PHONEME_TEXT_TEMPLATE.format(symbol=symbol.strip())


def build_tasks(
    *,
    entries: list[dict],
    ids: set[str] | None,
    symbols: set[str] | None,
    include_phonemes: bool,
    include_words: bool,
) -> list[AudioTask]:
    tasks: list[AudioTask] = []

    for entry in entries:
        entry_id = str(entry.get("id") or "").strip()
        symbol = str(entry.get("symbol") or "").strip()
        if ids and entry_id not in ids:
            continue
        if symbols and symbol not in symbols:
            continue

        if include_phonemes:
            phoneme_audio = entry["phonemeAudio"]
            tasks.append(
                AudioTask(
                    label=f"phoneme:{entry_id}",
                    text=build_phoneme_text(symbol),
                    prompt="",
                    output_path=ROOT_DIR / "public" / Path(str(phoneme_audio["path"])),
                    backend="genai_stream",
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
                        backend="cloud_tts",
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


def parse_audio_mime_type(mime_type: str) -> dict[str, int]:
    bits_per_sample = 16
    rate = 24000
    channels = 1
    for param in mime_type.split(";"):
        normalized = param.strip().lower()
        if normalized.startswith("rate="):
            try:
                rate = int(normalized.split("=", 1)[1])
            except (ValueError, IndexError):
                pass
        elif normalized.startswith("channels="):
            try:
                channels = int(normalized.split("=", 1)[1])
            except (ValueError, IndexError):
                pass
        elif normalized.startswith("audio/l"):
            try:
                bits_per_sample = int(normalized.split("l", 1)[1])
            except (ValueError, IndexError):
                pass
    return {
        "bits_per_sample": bits_per_sample,
        "rate": rate,
        "channels": channels,
    }


def convert_pcm_to_wav(audio_data: bytes, mime_type: str) -> bytes:
    parameters = parse_audio_mime_type(mime_type)
    bits_per_sample = parameters["bits_per_sample"]
    rate = parameters["rate"]
    channels = parameters["channels"]
    data_size = len(audio_data)
    bytes_per_sample = bits_per_sample // 8
    block_align = channels * bytes_per_sample
    byte_rate = rate * block_align
    chunk_size = 36 + data_size
    header = struct.pack(
        "<4sI4s4sIHHIIHH4sI",
        b"RIFF",
        chunk_size,
        b"WAVE",
        b"fmt ",
        16,
        1,
        channels,
        rate,
        byte_rate,
        block_align,
        bits_per_sample,
        b"data",
        data_size,
    )
    return header + audio_data


def encode_wav_to_mp3(wav_bytes: bytes) -> bytes:
    result = subprocess.run(
        [
            "ffmpeg",
            "-loglevel",
            "error",
            "-y",
            "-i",
            "pipe:0",
            "-codec:a",
            "libmp3lame",
            "-q:a",
            "2",
            "-f",
            "mp3",
            "pipe:1",
        ],
        input=wav_bytes,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if result.returncode != 0:
        error_text = result.stderr.decode("utf-8", errors="replace").strip()
        raise RuntimeError(f"ffmpeg mp3 encoding failed: {error_text}")
    if not result.stdout:
        raise RuntimeError("ffmpeg returned empty mp3 output.")
    return bytes(result.stdout)


def synthesize_genai_stream_mp3(
    *,
    client: genai.Client,
    model_name: str,
    voice_name: str,
    text: str,
) -> bytes:
    contents = [
        genai_types.Content(
            role="user",
            parts=[genai_types.Part.from_text(text=text)],
        )
    ]
    config = genai_types.GenerateContentConfig(
        temperature=1,
        response_modalities=["audio"],
        speech_config=genai_types.SpeechConfig(
            voice_config=genai_types.VoiceConfig(
                prebuilt_voice_config=genai_types.PrebuiltVoiceConfig(
                    voice_name=voice_name
                )
            )
        ),
    )
    raw_chunks: list[bytes] = []
    mime_type = "audio/l16; rate=24000; channels=1"
    for chunk in client.models.generate_content_stream(
        model=model_name,
        contents=contents,
        config=config,
    ):
        if not chunk.parts:
            continue
        inline_data = getattr(chunk.parts[0], "inline_data", None)
        if inline_data and inline_data.data:
            raw_chunks.append(inline_data.data)
            if inline_data.mime_type:
                mime_type = str(inline_data.mime_type)
    if not raw_chunks:
        raise RuntimeError("GenAI stream returned no audio chunks.")
    wav_bytes = convert_pcm_to_wav(b"".join(raw_chunks), mime_type)
    return encode_wav_to_mp3(wav_bytes)


def synthesize_genai_stream_mp3_with_retry(
    *,
    client: genai.Client,
    model_name: str,
    voice_name: str,
    text: str,
) -> bytes:
    last_error: Exception | None = None
    for delay in (0.0, *DEFAULT_RETRY_DELAYS):
        if delay:
            time.sleep(delay)
        try:
            return synthesize_genai_stream_mp3(
                client=client,
                model_name=model_name,
                voice_name=voice_name,
                text=text,
            )
        except Exception as exc:  # pragma: no cover - runtime/network dependent
            last_error = exc
    raise RuntimeError(f"GenAI stream synthesis failed after retries: {last_error}") from last_error


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="backslashreplace")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8", errors="backslashreplace")
    load_local_env()

    parser = argparse.ArgumentParser(
        description="Generate mp3 audio for the IPA teaching site using Gemini 3.1 TTS."
    )
    parser.add_argument(
        "--ids",
        help="Comma-separated phoneme ids to generate, for example: i,ih,sh",
    )
    parser.add_argument(
        "--symbols",
        help='Comma-separated IPA symbols to generate, for example: "/ɛ/,/ŋ/"',
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
    requested_ids = (
        {item.strip() for item in args.ids.split(",") if item.strip()} if args.ids else None
    )
    requested_symbols = (
        {item.strip() for item in args.symbols.split(",") if item.strip()}
        if args.symbols
        else None
    )

    tasks = build_tasks(
        entries=entries,
        ids=requested_ids,
        symbols=requested_symbols,
        include_phonemes=not args.words_only,
        include_words=not args.phonemes_only,
    )

    if args.limit > 0:
        tasks = tasks[: args.limit]

    uses_cloud_tts = any(task.backend == "cloud_tts" for task in tasks)
    uses_genai_stream = any(task.backend == "genai_stream" for task in tasks)
    cloud_client = None
    genai_client = None
    project = ""
    if uses_cloud_tts:
        cloud_client, project = resolve_client()
    if uses_genai_stream:
        genai_client, genai_project = resolve_genai_client()
        if not project:
            project = genai_project

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
            if task.backend == "genai_stream":
                audio_bytes = synthesize_genai_stream_mp3_with_retry(
                    client=genai_client,
                    model_name=args.model,
                    voice_name=args.voice,
                    text=task.text,
                )
            else:
                audio_bytes = synthesize_mp3_with_retry(
                    client=cloud_client,
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
