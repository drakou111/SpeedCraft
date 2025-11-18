// src/utils/CraftingRecipes.ts
import type { Item } from "../types/Item";

export type Recipe = {
  input: (string | null)[][];
  output: Item;
};

export const recipes: Recipe[] = [
  {
    input: [
      ["cod", "cod"],
      ["cod", "cod"],
    ],
    output: { id: "iron_ingot", name: "Iron Ingot", icon: "./items/iron_ingot.png", count: 3, stack_size: 64 }
  },
];
