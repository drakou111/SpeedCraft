// src/utils/CraftingRecipes.ts
import type { Item } from "../types/Item";

export type RecipeType = "SHAPED" | "SHAPELESS";

export type Recipe = {
  type: RecipeType;
  input: (string | null)[][] | (string | null)[];
  output: Item;
  secondaryOutput?: (string | string[] | null)[][] | (string | string[] | null)[];
};
