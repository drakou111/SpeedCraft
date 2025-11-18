// src/utils/CraftingUtils.ts
import type { Slot } from "../types/Slot";
import { recipes } from "../types/Recipe";

export function getCraftingResult(inputSlots: Slot[]): Slot["item"] | null {
  const size = Math.sqrt(inputSlots.length);
  const gridIds: (string | null)[][] = [];

  for (let y = 0; y < size; y++) {
    const row: (string | null)[] = [];
    for (let x = 0; x < size; x++) {
      const slot = inputSlots[y * size + x];
      row.push(slot.item?.id ?? null);
    }
    gridIds.push(row);
  }

  for (const recipe of recipes) {
    let match = true;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if ((recipe.input[y]?.[x] ?? null) !== gridIds[y]?.[x]) {
          match = false;
          break;
        }
      }
      if (!match) break;
    }
    if (match) return { ...recipe.output };
  }

  return null;
}
