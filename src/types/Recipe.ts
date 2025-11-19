// src/utils/CraftingRecipes.ts
import type { Item } from "../types/Item";

export type RecipeType = "SHAPED" | "SHAPELESS";

export type Recipe = {
  type: RecipeType;
  input: (string | null)[][] | (string | null)[]; // 2D array for shaped, 1D array for shapeless
  output: Item;
};

export const recipes: Recipe[] = [
  {
    type: "SHAPED",
    input: [
      ["cod", null],
      ["cod", "cod"],
    ],
    output: { id: "iron_ingot", name: "Iron Ingot", icon: "./items/iron_ingot.png", count: 3, stack_size: 64 },
  },
  {
    type: "SHAPELESS",
    input: ["apple", "cod", "heart_of_the_sea"], // order doesn’t matter
    output: { id: "golden_apple", name: "Golden apple", icon: "./items/golden_apple.png", count: 1, stack_size: 64 },
  },
];
