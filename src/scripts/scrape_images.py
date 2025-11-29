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

DEFAULT_ITEMS_JSON = Path("src/data/items/all_items.json")
DEFAULT_IMAGES_DIR = Path("public/items")
DEFAULT_HTML = Path("public/html.html")
USER_AGENT = "ItemImageFetcher/1.0 (+https://example.invalid)"
DOWNLOAD_TIMEOUT = 20
RETRY_COUNT = 2
RETRY_BACKOFF = 1.2

def load_items(items_json_path: Path) -> List[dict]:
    with items_json_path.open("r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, list):
        raise ValueError("items json must be an array of items")
    return data


def ensure_dir(p: Path):
    p.mkdir(parents=True, exist_ok=True)


def parse_html_for_files(html_path: Path) -> Dict[str, str]:
    html_text = html_path.read_text(encoding="utf-8")
    soup = BeautifulSoup(html_text, "html.parser")

    mapping: Dict[str, str] = {}

    for li in soup.find_all("li"):
        file_a = None
        for a in li.find_all("a", href=True):
            if "File:" in a["href"] or "/w/File:" in a["href"] or a["href"].lstrip("/").startswith("File:"):
                file_a = a
                break

        page_a = None
        for a in li.find_all("a", href=True):
            if a is file_a:
                continue
            if "File:" not in a["href"]:
                page_a = a
        if not file_a or not page_a:
            continue

        display_name = page_a.get_text(strip=True)
        if not display_name:
            continue

        href = file_a["href"]
        m = re.search(r"(?:File:)([^/?#]+)", href)
        if not m:
            filename = Path(href).name
        else:
            filename = m.group(1)

        normalized = normalize_name(display_name)
        mapping[normalized] = filename

    return mapping


def normalize_name(s: str) -> str:
    s2 = s.strip().lower()
    s2 = re.sub(r"\s+", " ", s2)
    s2 = re.sub(r"[‘’'\",()]", "", s2)
    return s2


def build_alternate_keys(item: dict) -> List[str]:
    out = []
    name = item.get("name", "") or ""
    id_ = item.get("id", "") or ""

    if name:
        out.append(normalize_name(name))
        out.append(normalize_name(name).replace(" ", "_"))
        out.append(normalize_name(name).replace(" ", ""))
        out.append(normalize_name(name).replace(" ", "-"))

    if id_:
        stripped = id_.split(":", 1)[-1]
        out.append(normalize_name(stripped.replace("_", " ")))
        out.append(normalize_name(stripped))
        out.append(stripped)
        out.append(id_)

    seen = set()
    final = []
    for k in out:
        if k and k not in seen:
            final.append(k)
            seen.add(k)
    return final


def find_best_file_for_item(item: dict, mapping: Dict[str, str]) -> Tuple[Optional[str], str]:
    alts = build_alternate_keys(item)
    for k in alts:
        if k in mapping:
            return mapping[k], f"exact match on '{k}'"

    if item.get("name"):
        keys = list(mapping.keys())
        nm = normalize_name(item["name"])
        matches = get_close_matches(nm, keys, n=3, cutoff=0.8)
        if matches:
            return mapping[matches[0]], f"fuzzy match '{matches[0]}' for '{nm}'"

    if item.get("name"):
        nm = normalize_name(item["name"])
        for k in mapping.keys():
            if nm in k or k in nm:
                return mapping[k], f"substring match '{k}' vs '{nm}'"

    return None, "no match"


def build_download_url(file_filename: str) -> str:
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

        file_fn, reason = find_best_file_for_item(item, mapping)
        if file_fn is None:
            missing.append((item, "no mapping found"))
            continue

        download_url = build_download_url(file_fn)
        print(f"[{idx}/{len(items_to_process)}] {item.get('id')} -> {icon_name}  (match: {reason})")
        success = download_file(download_url, dest_file, dry_run=dry_run)
        if success:
            downloaded.append((item, download_url))
            time.sleep(0.2 + random.random() * 0.6)
        else:
            failed.append((item, download_url))

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
