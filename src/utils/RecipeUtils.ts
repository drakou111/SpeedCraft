// src/utils/RecipeUtils.ts
import type { Item } from "../types/Item";
import { type Recipe } from "../types/Recipe";
import { getItemById } from "./ItemUtils";

import rawRecipes from "../data/recipes/compiled_recipes.json" assert { type: "json" };

function ensureMinecraftPrefix(id: string) {
    return id && id.startsWith("minecraft:") ? id : `minecraft:${id}`;
}

function normalizePattern(pattern: any): any {
    // Shapeless array: ["id", ["id1","id2"], ...]
    if (Array.isArray(pattern) && !Array.isArray(pattern[0])) {
        return pattern as (string | string[] | null)[];
    }

    // Shaped 2D pattern (array of rows)
    if (Array.isArray(pattern)) {
        return pattern.map((row: any) =>
            Array.isArray(row) ? row : [row]
        ) as (string | string[] | null)[][];
    }

    return pattern;
}

function normalizeRawToRecipe(raw: any): Recipe | null {
    if (!raw) return null;

    const typeRaw = (raw.type ?? "").toString().toUpperCase();
    const type: Recipe["type"] = typeRaw === "SHAPED" ? "SHAPED" : "SHAPELESS";

    // inputs
    const inputRaw =
        raw.input ?? raw.pattern ?? raw.ingredients ?? raw;
    const input = normalizePattern(inputRaw);

    // secondary outputs
    const secondaryRaw = raw.secondaryOutput ?? null;
    const secondaryOutput = secondaryRaw
        ? normalizePattern(secondaryRaw)
        : undefined;

    // output item (primary)
    const outIdRaw = raw.output?.id ?? raw.result?.id ?? "";
    if (!outIdRaw) return null;

    const outId = ensureMinecraftPrefix(outIdRaw);
    const outCount = Number(
        raw.output?.count ??
        raw.result?.count ??
        raw.output?.amount ??
        1
    );

    const found = getItemById(outId);
    if (!found) return null;

    const output: Item = {
        ...found,
        id: outId,
        count: outCount,
        stack_size: found.stack_size ?? 64,
    };

    return {
        type,
        input,
        output,
        secondaryOutput,
    } as Recipe;
}

const _rawArr: any[] = (rawRecipes as any) || [];
const recipes: Recipe[] = _rawArr
    .map(normalizeRawToRecipe)
    .filter((r): r is Recipe => r !== null);

export function getAllRecipes(): Recipe[] {
    return recipes;
}

export function getRecipesWithResolvedOutput(): Recipe[] {
    return recipes.map((r) => {
        const resolved = getItemById(r.output.id);
        if (!resolved) return r;

        const patchedOutput: Item = {
            ...resolved,
            id: r.output.id,
            count: r.output.count,
            stack_size: r.output.stack_size,
        };

        return {
            ...r,
            output: patchedOutput,
        };
    });
}

export function allPossibleItemsFromInput(items: Item[]) {
  const recipes = getAllRecipes();

  const have: Record<string, Item> = {};

  for (const it of items) {
    if (!it) continue;
    if (!have[it.id]) {
      have[it.id] = { ...it };
    }
  }

  let changed = true;

  while (changed) {
    changed = false;

    const currentItems = Object.values(have);

    for (const recipe of recipes) {
      const outId = recipe.output.id;
      if (have[outId]) continue;

      if (recipeSatisfied(recipe, currentItems)) {
        have[outId] = { ...recipe.output };
        changed = true;
      }
    }
  }

  return Object.values(have);
}



export function recipeSatisfied(recipe: Recipe, items: Item[]) {
  const available = new Set(items.filter(Boolean).map(i => i.id));
  function satisfiedSlot(slot: string | string[] | null): boolean {
    if (slot == null) return true;

    if (typeof slot === "string") {
      return available.has(slot);
    }

    for (const id of slot) {
      if (id && available.has(id)) return true;
    }

    return false;
  }

  if (recipe.type === "SHAPELESS") {
    const input = recipe.input as (string | string[] | null)[];
    for (const slot of input) {
      if (!satisfiedSlot(slot)) return false;
    }
    return true;
  }

  // Check shaped recipe
  const grid = recipe.input as (string | string[] | null)[][];
  for (const row of grid) {
    for (const slot of row) {
      if (!satisfiedSlot(slot)) return false;
    }
  }

  return true;
}


