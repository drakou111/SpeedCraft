import os
import json
from typing import Dict, List, Set

TAGS_ROOT = "./src/data/tags/all"     # root folder containing tags
OUTPUT_FILE = "all_tags.json" # output file for final merged tags


def normalize_id(id_str: str) -> str:
    """Ensure the ID starts with 'minecraft:'."""
    if ":" not in id_str:
        return f"minecraft:{id_str}"
    return id_str


def load_raw_tags() -> Dict[str, List[str]]:
    """
    Recursively scan TAGS_ROOT and load every json file.
    Produce a dict: { "minecraft:tag_name": ["values"] }
    """
    raw_tags = {}

    for root, dirs, files in os.walk(TAGS_ROOT):
        for filename in files:
            if filename.endswith(".json"):
                full_path = os.path.join(root, filename)

                with open(full_path, "r", encoding="utf-8") as f:
                    try:
                        data = json.load(f)
                    except Exception as e:
                        print(f"ERROR reading {full_path}: {e}")
                        continue

                tag_name = os.path.splitext(filename)[0]
                tag_name = normalize_id(tag_name)

                values = data.get("values", [])
                raw_tags[tag_name] = values

    return raw_tags


def resolve_tag(tag: str, raw_tags: Dict[str, List[str]], cache: Dict[str, Set[str]], stack: Set[str]) -> Set[str]:
    """
    Resolve all nested tags inside 'tag'.
    Returns a set of final item IDs (no '#' entries).
    Uses DFS with cycle-detection.
    """
    if tag in cache:
        return cache[tag]

    if tag in stack:
        raise RuntimeError(f"Cycle detected in tags: {' -> '.join(stack)} -> {tag}")

    stack.add(tag)

    resolved: Set[str] = set()
    raw_values = raw_tags.get(tag, [])

    for value in raw_values:
        if value.startswith("#"):
            nested_tag = normalize_id(value[1:])
            if nested_tag == tag:
                continue
            resolved.update(resolve_tag(nested_tag, raw_tags, cache, stack))
        else:
            resolved.add(normalize_id(value))

    stack.remove(tag)
    cache[tag] = resolved
    return resolved


def main():
    print("Loading raw tags...")
    raw_tags = load_raw_tags()

    print(f"Loaded {len(raw_tags)} raw tags.")

    print("Resolving nested tags...")
    resolved_tags: Dict[str, List[str]] = {}
    cache: Dict[str, Set[str]] = {}

    for tag_name in raw_tags.keys():
        resolved = resolve_tag(tag_name, raw_tags, cache, set())
        resolved_tags[tag_name] = sorted(resolved)

    print(f"Resolved {len(resolved_tags)} tags. Writing output...")

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(resolved_tags, f, indent=2)

    print(f"Done! Output written to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
