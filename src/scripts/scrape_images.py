#!/usr/bin/env python3
"""
fetch_missing_images.py

Usage:
  python fetch_missing_images.py \
    --items data/items/all_items.json \
    --images public/items \
    --html public/wiki_items.html \
    --dry-run   # optional, don't actually download

Script behavior:
  - For every item entry in items json, check if images/<icon> exists.
  - If missing, parse the HTML file of <li> entries and map display names -> File: filenames.
  - Try to find a match for the item's name (several heuristics + fuzzy).
  - If found, build URL: https://minecraft.wiki/images/<FileName>?bd101&format=original
    and download it saving to images/<icon>.
"""
import argparse
import json
import re
import sys
import time
import random
from pathlib import Path
from typing import Dict, Optional, Tuple, List

import requests
from bs4 import BeautifulSoup
from difflib import get_close_matches

# --- Configurable defaults ---
DEFAULT_ITEMS_JSON = Path("src/data/items/all_items.json")
DEFAULT_IMAGES_DIR = Path("public/items")
DEFAULT_HTML = Path("public/html.html")
USER_AGENT = "ItemImageFetcher/1.0 (+https://example.invalid)"  # polite UA
DOWNLOAD_TIMEOUT = 20  # seconds
RETRY_COUNT = 2
RETRY_BACKOFF = 1.2

# --- Helpers ---


def load_items(items_json_path: Path) -> List[dict]:
    with items_json_path.open("r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, list):
        raise ValueError("items json must be an array of items")
    return data


def ensure_dir(p: Path):
    p.mkdir(parents=True, exist_ok=True)


def parse_html_for_files(html_path: Path) -> Dict[str, str]:
    """
    Parse the HTML file and build a mapping:
      normalized_name -> file_filename (e.g. "Acacia Sapling" -> "Acacia_Sapling_JE7_BE2.png")

    It looks for <li> entries that contain two anchors:
      - a file anchor with href like "/w/File:Acacia_Sapling_JE7_BE2.png"
      - a page anchor with the display name "Acacia Sapling"

    Returns mapping of normalized_name -> file_filename
    """
    html_text = html_path.read_text(encoding="utf-8")
    soup = BeautifulSoup(html_text, "html.parser")

    mapping: Dict[str, str] = {}

    for li in soup.find_all("li"):
        # find the anchor that links to the file
        file_a = None
        for a in li.find_all("a", href=True):
            if "File:" in a["href"] or "/w/File:" in a["href"] or a["href"].lstrip("/").startswith("File:"):
                file_a = a
                break

        # find the page/display anchor (likely the last <a> that's not the file anchor)
        page_a = None
        for a in li.find_all("a", href=True):
            if a is file_a:
                continue
            # skip file-description anchors; pick an anchor whose href doesn't contain 'File:'
            if "File:" not in a["href"]:
                page_a = a  # last non-file anchor will be kept
        if not file_a or not page_a:
            # fallback: sometimes the li contains the display text as plain text
            # try to find a text node
            continue

        display_name = page_a.get_text(strip=True)
        if not display_name:
            continue

        # file href might be "/w/File:Name.png" or "/File:Name.png"
        href = file_a["href"]
        # try to extract the filename after 'File:' and after the last slash
        m = re.search(r"(?:File:)([^/?#]+)", href)
        if not m:
            # as fallback, take the last path component
            filename = Path(href).name
        else:
            filename = m.group(1)

        # normalize mapping key for flexible lookups
        normalized = normalize_name(display_name)
        mapping[normalized] = filename

    return mapping


def normalize_name(s: str) -> str:
    # Lowercase, strip, collapse whitespace, remove punctuation like parentheses
    s2 = s.strip().lower()
    s2 = re.sub(r"\s+", " ", s2)
    s2 = re.sub(r"[‘’'\",()]", "", s2)
    return s2


def build_alternate_keys(item: dict) -> List[str]:
    """
    Build alternative normalized keys to try to match HTML display names.
    E.g. item.name "Yellow Shulker Box" -> "yellow shulker box", "yellow_shulker_box", "yellowshulkerbox",
    also try id-based forms: strip 'minecraft:' prefix, replace underscores with spaces, etc.
    """
    out = []
    name = item.get("name", "") or ""
    id_ = item.get("id", "") or ""

    # main normalized name
    if name:
        out.append(normalize_name(name))
        out.append(normalize_name(name).replace(" ", "_"))
        out.append(normalize_name(name).replace(" ", ""))
        out.append(normalize_name(name).replace(" ", "-"))

    # ID-based keys
    if id_:
        stripped = id_.split(":", 1)[-1]
        out.append(normalize_name(stripped.replace("_", " ")))
        out.append(normalize_name(stripped))
        out.append(stripped)  # raw id tail
        out.append(id_)  # full id

    # dedupe while preserving order
    seen = set()
    final = []
    for k in out:
        if k and k not in seen:
            final.append(k)
            seen.add(k)
    return final


def find_best_file_for_item(item: dict, mapping: Dict[str, str]) -> Tuple[Optional[str], str]:
    """
    Try to find the best file filename for the given item using mapping.
    Returns (filename_or_None, reason)
    """
    alts = build_alternate_keys(item)
    # exact attempts
    for k in alts:
        if k in mapping:
            return mapping[k], f"exact match on '{k}'"

    # try fuzzy match on mapping keys using item.name
    if item.get("name"):
        keys = list(mapping.keys())
        nm = normalize_name(item["name"])
        matches = get_close_matches(nm, keys, n=3, cutoff=0.8)
        if matches:
            return mapping[matches[0]], f"fuzzy match '{matches[0]}' for '{nm}'"

    # try partial substring match
    if item.get("name"):
        nm = normalize_name(item["name"])
        for k in mapping.keys():
            if nm in k or k in nm:
                return mapping[k], f"substring match '{k}' vs '{nm}'"

    return None, "no match"


def build_download_url(file_filename: str) -> str:
    # per your rule: https://minecraft.wiki/images/<FileName>?bd101&format=original
    # ensure no leading slashes
    fn = file_filename.lstrip("/")
    return f"https://minecraft.wiki/images/{fn}?bd101&format=original"


def download_file(url: str, dest_path: Path, dry_run: bool = False) -> bool:
    headers = {"User-Agent": USER_AGENT}
    if dry_run:
        print(f"[DRY-RUN] Would GET {url} -> {dest_path}")
        return True

    for attempt in range(RETRY_COUNT + 1):
        try:
            resp = requests.get(url, headers=headers, timeout=DOWNLOAD_TIMEOUT, stream=True)
            if resp.status_code == 200:
                # write to file
                with dest_path.open("wb") as f:
                    for chunk in resp.iter_content(chunk_size=64 * 1024):
                        if chunk:
                            f.write(chunk)
                return True
            else:
                print(f"HTTP {resp.status_code} for {url} (attempt {attempt+1})")
        except Exception as exc:
            print(f"Error downloading {url}: {exc} (attempt {attempt+1})")

        if attempt < RETRY_COUNT:
            backoff = RETRY_BACKOFF ** attempt
            time.sleep(0.5 + backoff * random.random())

    return False


def main(
    items_json: Path,
    images_dir: Path,
    html_file: Path,
    dry_run: bool = False,
    limit: Optional[int] = None,
):
    items = load_items(items_json)
    ensure_dir(images_dir)

    print(f"Loaded {len(items)} items from {items_json}")
    if not html_file.exists():
        print(f"HTML file {html_file} not found. Cannot parse wiki image list.")
        # We continue: we will only report missing images but cannot fetch them.
        mapping = {}
    else:
        mapping = parse_html_for_files(html_file)
        print(f"Parsed {len(mapping)} name->file entries from {html_file}")

    missing = []
    downloaded = []
    skipped = []
    failed = []

    items_to_process = items if limit is None else items[:limit]

    for idx, item in enumerate(items_to_process, 1):
        icon_name = item.get("icon") or ""
        if not icon_name:
            missing.append((item, "no icon field"))
            continue

        dest_file = images_dir / icon_name
        if dest_file.exists():
            skipped.append((item, "already exists"))
            continue

        # Try to find file in parsed mapping
        file_fn, reason = find_best_file_for_item(item, mapping)
        if file_fn is None:
            missing.append((item, "no mapping found"))
            continue

        download_url = build_download_url(file_fn)
        print(f"[{idx}/{len(items_to_process)}] {item.get('id')} -> {icon_name}  (match: {reason})")
        # attempt download
        success = download_file(download_url, dest_file, dry_run=dry_run)
        if success:
            downloaded.append((item, download_url))
            # brief random sleep so we don't hammer
            time.sleep(0.2 + random.random() * 0.6)
        else:
            failed.append((item, download_url))

    # Summary
    print("\n=== Summary ===")
    print(f"Total items considered: {len(items_to_process)}")
    print(f"Downloaded: {len(downloaded)}")
    print(f"Skipped (already existed): {len(skipped)}")
    print(f"Missing (no map): {len(missing)}")
    print(f"Failed downloads: {len(failed)}")

    if missing:
        print("\nItems with no mapping found (examples):")
        for it, reason in missing[:20]:
            print(f" - {it.get('id')} | {it.get('name')} -> {reason}")

    if failed:
        print("\nFailed downloads (examples):")
        for it, url in failed[:20]:
            print(f" - {it.get('id')} -> {url}")


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--items", type=str, default=str(DEFAULT_ITEMS_JSON), help="path to items json")
    p.add_argument("--images", type=str, default=str(DEFAULT_IMAGES_DIR), help="images output dir")
    p.add_argument("--html", type=str, default=str(DEFAULT_HTML), help="local HTML file to scan for image <li>s")
    p.add_argument("--dry-run", action="store_true", help="don't actually download, just simulate")
    p.add_argument("--limit", type=int, default=None, help="limit number of items processed (for testing)")
    args = p.parse_args()

    try:
        main(Path(args.items), Path(args.images), Path(args.html), dry_run=args.dry_run, limit=args.limit)
    except KeyboardInterrupt:
        print("Interrupted by user", file=sys.stderr)
        sys.exit(1)
