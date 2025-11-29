import json
from pathlib import Path

COMPILED = Path("./src/data/recipes/compiled_recipes.json")
OUTPUT = Path("all_items.json")


def flatten_input(inp):
    """Flatten shaped/shapeless recipe inputs into a list of strings."""
    if inp is None:
        return []
    if isinstance(inp, str):
        return [inp]
    if isinstance(inp, list):
        out = []
        for x in inp:
            out.extend(flatten_input(x))
        return out
    print("WARNING: unknown ingredient structure:", inp)
    return []


def normalize_name(id_str: str) -> str:
    """
    Convert:
        "minecraft:yellow_bed" -> "Yellow Bed"
        "#minecraft:planks" -> "Planks"
    """
    if id_str.startswith("#"):
        id_str = id_str[1:]  # remove tag '#minecraft:planks'

    if ":" in id_str:
        id_str = id_str.split(":", 1)[1]  # remove "minecraft:"

    return " ".join(word.capitalize() for word in id_str.split("_"))


def icon_from_id(id_str: str) -> str:
    """
    Convert:
        "minecraft:yellow_bed" -> "yellow_bed.png"
        "#minecraft:planks" -> "planks.png"
    """
    if id_str.startswith("#"):
        id_str = id_str[1:]

    if ":" in id_str:
        id_str = id_str.split(":", 1)[1]

    return f"{id_str}.png"


def main():
    if not COMPILED.exists():
        print(f"ERROR: Cannot find {COMPILED}")
        return

    with open(COMPILED, "r", encoding="utf-8") as f:
        recipes = json.load(f)

    ids = set()

    for r in recipes:
        # Collect outputs
        out = r.get("output", {})
        if "id" in out:
            ids.add(out["id"])

        # Collect inputs
        inp = r.get("input")
        if inp:
            for ing in flatten_input(inp):
                ids.add(ing)

    # Build JSON objects
    items = []
    for id_str in sorted(ids):
        items.append({
            "id": id_str,
            "name": normalize_name(id_str),
            "icon": icon_from_id(id_str),
            "count": 0,
            "stack_size": 64
        })

    # Save file
    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(items, f, indent=2)

    print(f"Generated {OUTPUT} with {len(items)} items.")


if __name__ == "__main__":
    main()
