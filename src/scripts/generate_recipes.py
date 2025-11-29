#!/usr/bin/env python3
"""
Compile Minecraft-style recipes into:
src/data/recipes/compiled_recipes.json

Now supports TAG EXPANSION:
Any "#minecraft:tag" is replaced with the full list from:
src/data/tags/all_tags.json
"""

from __future__ import annotations
import json
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Union
import argparse

ProjectRoot = Path.cwd()

SRC_RECIPES = ProjectRoot / "src" / "data" / "recipes"
SRC_TAGS = ProjectRoot / "src" / "data" / "tags"
OUT_FILE = SRC_RECIPES / "compiled_recipes.json"


NormalizedIngredient = Union[str, List[str]]
NormalizedShapedGrid = List[List[Optional[NormalizedIngredient]]]


def load_all_tags() -> Dict[str, List[str]]:
    all_tags_path = SRC_TAGS / "all_tags.json"
    try:
        data = json.loads(all_tags_path.read_text(encoding="utf8"))
        # data shape: { "minecraft:planks": ["oak_planks", "birch_planks", ...] }
        return data
    except Exception as e:
        print(f"FATAL: Could not load {all_tags_path}: {e}", file=sys.stderr)
        sys.exit(1)


def read_json_files(dirp: Path) -> List[Dict[str, Any]]:
    out = []
    if not dirp.exists():
        return out

    for p in sorted(dirp.glob("*.json")):
        try:
            out.append({"filename": p.name, "data": json.loads(p.read_text(encoding="utf8"))})
        except Exception as e:
            print(f"warning: failed to read {p}: {e}", file=sys.stderr)

    return out


# ------------------------------------------------------------
# normalize + tag expansion
# ------------------------------------------------------------
def expand_tag(value: str, all_tags: Dict[str, List[str]]) -> List[str]:
    """
    "#minecraft:planks" → list of all plank block IDs
    """
    tag_name = value[1:]  # remove leading '#'
    if tag_name in all_tags:
        return all_tags[tag_name]
    else:
        print(f"WARNING: Unknown tag '{tag_name}'", file=sys.stderr)
        return []


def normalize_ingredient_value(v: Any, all_tags: Dict[str, List[str]]) -> NormalizedIngredient:
    """Normalize one ingredient into string | list[string], with tag expansion."""
    if v is None:
        return None

    # String case: "minecraft:iron_ingot", "#minecraft:planks"
    if isinstance(v, str):
        if v.startswith("#"):
            # expand into list
            return expand_tag(v, all_tags)
        return v

    # Array case
    if isinstance(v, list):
        out: List[str] = []
        for el in v:
            if isinstance(el, str):
                if el.startswith("#"):
                    out.extend(expand_tag(el, all_tags))
                else:
                    out.append(el)
            elif isinstance(el, dict):
                if "item" in el:
                    out.append(el["item"])
                elif "tag" in el:
                    out.extend(expand_tag(el["tag"], all_tags))
            else:
                out.append(str(el))

        # remove duplicates
        return sorted(set(out))

    # Object case
    if isinstance(v, dict):
        if "item" in v:
            return v["item"]
        if "tag" in v:
            return expand_tag(v["tag"], all_tags)
        return json.dumps(v)

    # Unexpected type → string
    return str(v)


def strip_prefix(s: str) -> str:
    if s.startswith("minecraft:"):
        return s[10:]
    return s


# ------------------------------------------------------------
# main compiler
# ------------------------------------------------------------
def compile_recipes(keep_prefix: bool) -> List[Dict[str, Any]]:
    compiled: List[Dict[str, Any]] = []

    all_tags = load_all_tags()

    # Directories
    shaped_dir = SRC_RECIPES / "shaped"
    shapeless_dir = SRC_RECIPES / "shapeless"
    transmute_dir = SRC_RECIPES / "transmute"

    # --------------------------
    # SHAPED
    # --------------------------
    for f in read_json_files(shaped_dir):
        raw = f["data"]
        pattern = raw.get("pattern") or []
        key = raw.get("key") or {}
        result = raw.get("result") or {}

        if not pattern or not result:
            continue

        rows = len(pattern)
        cols = max(len(r) for r in pattern)

        grid: NormalizedShapedGrid = [[None for _ in range(cols)] for __ in range(rows)]

        for y, rowstr in enumerate(pattern):
            for x, ch in enumerate(rowstr):
                if ch == " ":
                    continue
                ing = key.get(ch)
                if ing:
                    grid[y][x] = normalize_ingredient_value(ing, all_tags)

        out_id = result.get("id")
        if not out_id:
            continue

        out_count = result.get("count", 1)
        out_id_norm = out_id if keep_prefix else strip_prefix(out_id)

        compiled.append({
            "type": "SHAPED",
            "input": grid,
            "output": {
                "id": out_id_norm,
                "count": out_count
            }
        })

    # --------------------------
    # SHAPELESS
    # --------------------------
    for f in read_json_files(shapeless_dir):
        raw = f["data"]
        ingredients = raw.get("ingredients") or []
        result = raw.get("result") or {}

        if not ingredients or not result:
            continue

        normalized = [
            normalize_ingredient_value(ing, all_tags)
            for ing in ingredients
        ]

        out_id = result.get("id")
        if not out_id:
            continue

        out_count = result.get("count", 1)
        out_id_norm = out_id if keep_prefix else strip_prefix(out_id)

        compiled.append({
            "type": "SHAPELESS",
            "input": normalized,
            "output": {
                "id": out_id_norm,
                "count": out_count
            }
        })

    # --------------------------
    # TRANSMUTE
    # --------------------------
    for f in read_json_files(transmute_dir):
        raw = f["data"]

        input_val = raw.get("input")
        material = raw.get("material")
        result = raw.get("result") or {}

        if input_val is None or material is None or not result:
            continue

        ing1 = normalize_ingredient_value(input_val, all_tags)
        ing2 = normalize_ingredient_value(material, all_tags)

        normalized = [ing1, ing2]

        out_id = result.get("id")
        out_count = result.get("count", 1)
        if not out_id:
            continue

        out_id_norm = out_id if keep_prefix else strip_prefix(out_id)

        compiled.append({
            "type": "SHAPELESS",
            "input": normalized,
            "output": {
                "id": out_id_norm,
                "count": out_count
            }
        })

    return compiled


def main(argv=None):
    parser = argparse.ArgumentParser()
    parser.add_argument("--keep-prefix", action="store_true")
    args = parser.parse_args(argv)

    compiled = compile_recipes(keep_prefix=True)

    OUT_FILE.write_text(json.dumps(compiled, indent=2), encoding="utf8")
    print(f"Wrote {OUT_FILE} ({len(compiled)} recipes, tags expanded).")


if __name__ == "__main__":
    main()
