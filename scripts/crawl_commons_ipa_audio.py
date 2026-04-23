from __future__ import annotations

import argparse
import html
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from urllib.error import HTTPError, URLError
from pathlib import Path
from typing import Any


ROOT_DIR = Path(__file__).resolve().parents[1]
PHONEMES_PATH = ROOT_DIR / "content" / "phonemes.json"
REPORT_PATH = ROOT_DIR / "content" / "commons-audio-report.json"
DOWNLOAD_DIR = ROOT_DIR / "public" / "audio" / "commons-phonemes"
MANIFEST_PATH = ROOT_DIR / "content" / "commons-download-manifest.json"
COMMONS_API_URL = "https://commons.wikimedia.org/w/api.php"
USER_AGENT = "LinguaForgeIPACommonsCrawler/1.0 (local educational research)"
REQUEST_DELAY_SECONDS = 0.8
DOWNLOAD_RETRY_DELAYS = (2.0, 5.0, 12.0)
API_RETRY_DELAYS = (1.5, 4.0, 10.0)
LIKELY_AUDIO_MIME_TYPES = {
    "application/ogg",
    "application/x-ogg",
}
LIKELY_AUDIO_SUFFIXES = {
    ".ogg",
    ".oga",
    ".wav",
    ".mp3",
    ".flac",
    ".opus",
}


EXACT_TITLE_CANDIDATES: dict[str, list[str]] = {
    "i": ["Close front unrounded vowel.ogg"],
    "ih": ["Near-close near-front unrounded vowel.ogg"],
    "eh": ["Open-mid front unrounded vowel.ogg"],
    "ae": ["Near-open front unrounded vowel.ogg"],
    "ah": ["Open back unrounded vowel.ogg"],
    "aw": ["Open-mid back rounded vowel.ogg"],
    "uh-short": ["Near-close near-back rounded vowel.ogg"],
    "oo": ["Close back rounded vowel.ogg"],
    "uh": ["Open-mid back unrounded vowel.ogg"],
    "schwa": ["Schwa.ogg", "Mid central vowel.ogg"],
    "p": ["Voiceless bilabial plosive.ogg"],
    "b": ["Voiced bilabial plosive.ogg"],
    "t": ["Voiceless alveolar plosive.ogg"],
    "d": ["Voiced alveolar plosive.ogg"],
    "k": ["Voiceless velar plosive.ogg"],
    "g": ["Voiced velar plosive.ogg"],
    "f": ["Voiceless labiodental fricative.ogg"],
    "v": ["Voiced labiodental fricative.ogg"],
    "th": ["Voiceless dental fricative.ogg"],
    "dh": ["Voiced dental fricative.ogg"],
    "s": ["Voiceless alveolar fricative.ogg"],
    "z": ["Voiced alveolar fricative.ogg"],
    "sh": ["Voiceless postalveolar fricative.ogg"],
    "zh": ["Voiced postalveolar fricative.ogg"],
    "h": ["Voiceless glottal fricative.ogg"],
    "ch": ["Voiceless postalveolar affricate.ogg"],
    "jh": ["Voiced postalveolar affricate.ogg"],
    "m": ["Voiced bilabial nasal.ogg"],
    "n": ["Voiced alveolar nasal.ogg"],
    "ng": ["Voiced velar nasal.ogg"],
    "l": ["Voiced alveolar lateral approximant.ogg"],
    "r": [
        "Voiced alveolar approximant.ogg",
        "Alveolar approximant.ogg",
        "Voiced postalveolar approximant.ogg",
        "Postalveolar approximant.ogg",
    ],
    "y": ["Voiced palatal approximant.ogg", "Palatal approximant.ogg"],
    "w": ["Voiced labio-velar approximant.ogg", "Labio-velar approximant.ogg"],
}


SPECIAL_SEARCH_QUERIES: dict[str, list[str]] = {
    "er-weak": [
        "File:R-colored schwa.ogg",
        "American English r-colored schwa file",
        "teacher water er sound file",
    ],
    "er-strong": [
        "File:Open-mid central vowel.ogg",
        "American English er sound bird nurse file",
        "r-colored vowel bird nurse file",
    ],
    "ay": [
        "File:En-us-day-they.ogg",
        "American English day they pronunciation file",
        "diphthong eɪ file",
    ],
    "eye": [
        "American English eye bike kite pronunciation file",
        "diphthong aɪ file",
        "high I pronunciation file",
    ],
    "oy": [
        "American English boy toy pronunciation file",
        "diphthong ɔɪ file",
    ],
    "ow": [
        "American English how now cow pronunciation file",
        "diphthong aʊ file",
    ],
    "oh": [
        "American English go no boat pronunciation file",
        "diphthong oʊ file",
    ],
}


def load_phonemes() -> list[dict[str, Any]]:
    return json.loads(PHONEMES_PATH.read_text(encoding="utf-8"))


def sanitize_text(value: str) -> str:
    no_tags = re.sub(r"<[^>]+>", "", value or "")
    return html.unescape(no_tags).strip()


def commons_request(params: dict[str, Any]) -> dict[str, Any]:
    query = urllib.parse.urlencode(params)
    url = f"{COMMONS_API_URL}?{query}"
    last_error: Exception | None = None
    for delay in (0.0, *API_RETRY_DELAYS):
        if delay:
            time.sleep(delay)
        try:
            request = urllib.request.Request(
                url,
                headers={"User-Agent": USER_AGENT},
            )
            with urllib.request.urlopen(request, timeout=40) as response:
                payload = response.read().decode("utf-8")
            time.sleep(REQUEST_DELAY_SECONDS)
            return json.loads(payload)
        except HTTPError as exc:
            last_error = exc
            if exc.code != 429:
                break
        except URLError as exc:
            last_error = exc
        except Exception as exc:  # pragma: no cover - runtime/network dependent
            last_error = exc
    raise RuntimeError(f"commons api request failed: {last_error}") from last_error


def normalize_file_title(title: str) -> str:
    title = title.strip()
    return title if title.startswith("File:") else f"File:{title}"


def file_extension_from_title(title: str) -> str:
    suffix = Path(title).suffix.lower()
    return suffix if suffix else ".bin"


def build_search_queries(entry: dict[str, Any]) -> list[str]:
    entry_id = str(entry["id"])
    exact_titles = EXACT_TITLE_CANDIDATES.get(entry_id, [])
    queries = [normalize_file_title(title) for title in exact_titles]
    queries.extend(SPECIAL_SEARCH_QUERIES.get(entry_id, []))
    queries.append(f'American English "{entry["keyword"]}" pronunciation file')
    queries.append(f'IPA "{entry["keyword"]}" pronunciation file')
    deduped: list[str] = []
    seen: set[str] = set()
    for query in queries:
      normalized = query.strip()
      if not normalized or normalized in seen:
          continue
      seen.add(normalized)
      deduped.append(normalized)
    return deduped


def fetch_file_info(title: str) -> dict[str, Any] | None:
    data = commons_request(
        {
            "action": "query",
            "prop": "imageinfo",
            "titles": normalize_file_title(title),
            "iiprop": "url|mime|size|extmetadata",
            "iilimit": 1,
            "iiextmetadatafilter": "LicenseShortName|LicenseUrl|UsageTerms|Artist|Credit|AttributionRequired|License",
            "format": "json",
        }
    )
    pages = data.get("query", {}).get("pages", {})
    if not pages:
        return None
    page = next(iter(pages.values()))
    if "missing" in page:
        return None
    imageinfo = (page.get("imageinfo") or [{}])[0]
    mime = str(imageinfo.get("mime") or "").strip()
    url = str(imageinfo.get("url") or "").strip()
    suffix = file_extension_from_title(str(page.get("title") or title))
    is_audio_like = mime.startswith("audio/") or mime in LIKELY_AUDIO_MIME_TYPES or suffix in LIKELY_AUDIO_SUFFIXES
    if not is_audio_like or not url:
        return None
    metadata = imageinfo.get("extmetadata") or {}
    return {
        "title": str(page.get("title") or normalize_file_title(title)),
        "download_url": url,
        "description_url": str(imageinfo.get("descriptionurl") or ""),
        "mime": mime,
        "size": int(imageinfo.get("size") or 0),
        "license_short_name": sanitize_text(metadata.get("LicenseShortName", {}).get("value", "")),
        "license_url": sanitize_text(metadata.get("LicenseUrl", {}).get("value", "")),
        "usage_terms": sanitize_text(metadata.get("UsageTerms", {}).get("value", "")),
        "artist": sanitize_text(metadata.get("Artist", {}).get("value", "")),
        "credit": sanitize_text(metadata.get("Credit", {}).get("value", "")),
        "attribution_required": sanitize_text(metadata.get("AttributionRequired", {}).get("value", "")),
    }


def search_files(query: str, limit: int) -> list[str]:
    data = commons_request(
        {
            "action": "query",
            "list": "search",
            "srsearch": query,
            "srnamespace": 6,
            "srlimit": limit,
            "format": "json",
        }
    )
    return [
        str(item.get("title") or "").strip()
        for item in data.get("query", {}).get("search", [])
        if str(item.get("title") or "").startswith("File:")
    ]


def discover_candidates(entry: dict[str, Any], limit_per_query: int) -> dict[str, Any]:
    entry_id = str(entry["id"])
    symbol = str(entry["symbol"])
    keyword = str(entry["keyword"])
    exact_titles = EXACT_TITLE_CANDIDATES.get(entry_id, [])
    search_queries = build_search_queries(entry)

    candidates: list[dict[str, Any]] = []
    seen_titles: set[str] = set()

    for title in exact_titles:
        info = fetch_file_info(title)
        if not info:
            continue
        normalized_title = info["title"]
        if normalized_title in seen_titles:
            continue
        seen_titles.add(normalized_title)
        info["match_type"] = "exact"
        info["source_query"] = normalize_file_title(title)
        candidates.append(info)

    for query in search_queries:
        titles = search_files(query, limit_per_query)
        for title in titles:
            if title in seen_titles:
                continue
            info = fetch_file_info(title)
            if not info:
                continue
            normalized_title = info["title"]
            if normalized_title in seen_titles:
                continue
            seen_titles.add(normalized_title)
            info["match_type"] = "search"
            info["source_query"] = query
            candidates.append(info)

    return {
        "id": entry_id,
        "symbol": symbol,
        "keyword": keyword,
        "search_queries": search_queries,
        "candidates": candidates,
    }


def download_file(url: str, output_path: Path) -> None:
    last_error: Exception | None = None
    for delay in (0.0, *DOWNLOAD_RETRY_DELAYS):
        if delay:
            time.sleep(delay)
        try:
            request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(request, timeout=60) as response:
                output_path.write_bytes(response.read())
            return
        except HTTPError as exc:
            last_error = exc
            if exc.code != 429:
                break
        except URLError as exc:
            last_error = exc
        except Exception as exc:  # pragma: no cover - runtime/network dependent
            last_error = exc
    raise RuntimeError(f"download failed: {last_error}") from last_error


def load_existing_manifest() -> dict[str, Any]:
    if not MANIFEST_PATH.exists():
        return {}
    return json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))


def main() -> int:
    global REQUEST_DELAY_SECONDS

    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="backslashreplace")

    parser = argparse.ArgumentParser(
        description="Discover openly licensed IPA audio candidates on Wikimedia Commons."
    )
    parser.add_argument(
        "--ids",
        help="Comma-separated phoneme ids to process, e.g. i,ih,sh",
    )
    parser.add_argument(
        "--limit-per-query",
        type=int,
        default=5,
        help="Maximum number of Commons search results to enrich per query.",
    )
    parser.add_argument(
        "--download-first",
        action="store_true",
        help="Download the first candidate for each phoneme into public/audio/commons-phonemes.",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Overwrite previously downloaded Commons files.",
    )
    parser.add_argument(
        "--request-delay",
        type=float,
        default=REQUEST_DELAY_SECONDS,
        help="Delay in seconds between Commons API requests.",
    )
    args = parser.parse_args()
    REQUEST_DELAY_SECONDS = max(0.0, args.request_delay)

    requested_ids = (
        {item.strip() for item in args.ids.split(",") if item.strip()} if args.ids else None
    )

    entries = load_phonemes()
    selected_entries = [
        entry for entry in entries if not requested_ids or str(entry["id"]) in requested_ids
    ]

    report: list[dict[str, Any]] = []
    manifest = load_existing_manifest()
    DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)
    failed_downloads: list[str] = []
    failed_discoveries: list[str] = []

    for entry in selected_entries:
        try:
            result = discover_candidates(entry, args.limit_per_query)
        except Exception as exc:
            entry_id = str(entry.get("id") or "")
            failed_discoveries.append(f"{entry_id}: {exc}")
            print(f"{entry_id}: discovery failed -> {exc}")
            continue
        report.append(result)
        best = result["candidates"][0] if result["candidates"] else None
        print(
            f'{result["id"]}: {len(result["candidates"])} candidates'
            + (f' -> {best["title"]}' if best else "")
        )

        if not args.download_first or not best:
            continue

        extension = file_extension_from_title(best["title"])
        output_path = DOWNLOAD_DIR / f'{result["id"]}{extension}'
        if output_path.exists() and not args.overwrite:
            print(f"  skip download {output_path}")
            manifest[result["id"]] = {
                **best,
                "local_path": str(output_path.relative_to(ROOT_DIR)).replace("\\", "/"),
            }
            continue

        try:
            download_file(best["download_url"], output_path)
            manifest[result["id"]] = {
                **best,
                "local_path": str(output_path.relative_to(ROOT_DIR)).replace("\\", "/"),
            }
            print(f"  downloaded {output_path}")
        except Exception as exc:
            failed_downloads.append(f'{result["id"]}: {exc}')
            print(f"  download failed for {result['id']}: {exc}")

    REPORT_PATH.write_text(
        json.dumps(report, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    if args.download_first:
        MANIFEST_PATH.write_text(
            json.dumps(manifest, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    print(f"report written to {REPORT_PATH}")
    if failed_discoveries:
        print("discovery_failures:")
        for item in failed_discoveries:
            print(f" - {item}")
    if args.download_first:
        print(f"manifest written to {MANIFEST_PATH}")
        if failed_downloads:
            print("download_failures:")
            for item in failed_downloads:
                print(f" - {item}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
