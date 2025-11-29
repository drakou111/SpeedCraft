// src/utils/CraftingUtils.ts
import type { Slot } from "../types/Slot";
import { getAllRecipes } from "../utils/RecipeUtils";
import { getItemById } from "../utils/ItemUtils";
import type { Item } from "../types/Item";

function ingredientMatchesAny(
    ingredient: string | string[] | null,
    candidateId: string | null
): boolean {
    if (ingredient === null) return candidateId === null;
    if (!candidateId) return false;

    if (typeof ingredient === "string") {
        return ingredient === candidateId;
    }

    if (Array.isArray(ingredient)) {
        for (const alt of ingredient) {
            if (ingredientMatchesAny(alt as any, candidateId)) return true;
        }
    }

    return false;
}

function matchesShaped(
    grid: (string | null)[][],
    recipeInput: (string | string[] | null)[][],
    offsetX: number,
    offsetY: number,
    flipped = false
): boolean {
    const recipeHeight = recipeInput.length;
    const recipeWidth = recipeInput[0]?.length ?? 0;
    const gridSize = grid.length;

    for (let y = 0; y < recipeHeight; y++) {
        for (let x = 0; x < recipeWidth; x++) {
            const recipeCell = flipped
                ? recipeInput[y][recipeWidth - 1 - x]
                : recipeInput[y][x];

            const gridY = offsetY + y;
            const gridX = offsetX + x;

            if (gridY >= gridSize || gridX >= gridSize) return false;

            const candidate = grid[gridY][gridX] ?? null;

            if (recipeCell === null) {
                if (candidate !== null) return false;
            } else {
                if (!ingredientMatchesAny(recipeCell as any, candidate)) return false;
            }
        }
    }

    return true;
}

function matchesShapeless(
    gridIdsFlat: (string | null)[],
    recipeInput: (string | string[] | null)[]
): boolean {
    const gridItems = gridIdsFlat.filter((g) => g !== null) as string[];
    const ingredients = recipeInput.filter((r) => r !== null) as (string | string[])[];

    if (gridItems.length !== ingredients.length) return false;

    const used = new Array(gridItems.length).fill(false);

    function backtrack(i: number): boolean {
        if (i >= ingredients.length) return true;
        const ing = ingredients[i];

        for (let j = 0; j < gridItems.length; j++) {
            if (used[j]) continue;
            if (ingredientMatchesAny(ing as any, gridItems[j])) {
                used[j] = true;
                if (backtrack(i + 1)) return true;
                used[j] = false;
            }
        }

        return false;
    }

    return backtrack(0);
}

function allOtherCellsEmpty(
    grid: (string | null)[][],
    offsetX: number,
    offsetY: number,
    recipeWidth: number,
    recipeHeight: number
): boolean {
    const size = grid.length;

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const insideRecipe =
                x >= offsetX &&
                x < offsetX + recipeWidth &&
                y >= offsetY &&
                y < offsetY + recipeHeight;

            if (!insideRecipe && grid[y][x] !== null) {
                return false;
            }
        }
    }

    return true;
}

function resolveSecondaryOutput(
    inputSlots: Slot[],
    recipe: any,
    size: number,
    offsetX?: number,
    offsetY?: number,
    flipped?: boolean
): (Item | null)[] {
    const sec = recipe.secondaryOutput;
    if (!sec) return [];

    const output: (Item | null)[] = new Array(size * size).fill(null);

    if (recipe.type === "SHAPELESS") {
        const recipeInput = recipe.input as (string | string[] | null)[];
        const secArr = sec as (string | null)[];
        const gridIds = inputSlots.map((s) => s.item?.id ?? null);

        const usedSlots = new Array(gridIds.length).fill(false);

        for (let i = 0; i < recipeInput.length; i++) {
            const ing = recipeInput[i];
            const secId = secArr[i];
            if (!secId) continue;

            const item = getItemById(secId);
            if (!item) continue;

            const slotIndex = gridIds.findIndex((id, idx) => !usedSlots[idx] && ingredientMatchesAny(ing, id));
            if (slotIndex === -1) continue;

            output[slotIndex] = { ...item, count: 1 };
            usedSlots[slotIndex] = true;
        }
    }
    else {
        const arr = sec as (string | null)[][];
        const h = arr.length;
        const w = arr[0]?.length ?? 0;

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const localX = flipped ? w - 1 - x : x;
                const id = arr[y][localX];
                if (!id) continue;

                const item = getItemById(id);
                if (!item) continue;

                const gridY = offsetY! + y;
                const gridX = offsetX! + x;

                const idx = gridY * size + gridX;
                output[idx] = { ...item, count: 1 };
            }
        }
    }

    return output;
}

export function getCraftingResult(
    inputSlots: Slot[]
): { output: Item | null; secondary: (Item | null)[] | null } {
    const size = Math.sqrt(inputSlots.length);
    const grid: (string | null)[][] = [];

    for (let y = 0; y < size; y++) {
        const row: (string | null)[] = [];
        for (let x = 0; x < size; x++) {
            row.push(inputSlots[y * size + x].item?.id ?? null);
        }
        grid.push(row);
    }

    for (const recipe of getAllRecipes()) {
        if (recipe.type === "SHAPELESS") {
            const flat = inputSlots.map((s) => s.item?.id ?? null);

            if (matchesShapeless(flat, recipe.input as any)) {
                return {
                    output: { ...recipe.output },
                    secondary: resolveSecondaryOutput(inputSlots, recipe, size)
                };
            }
        }

        else if (recipe.type === "SHAPED") {
            const recipeInput = recipe.input as (string | string[] | null)[][];
            const h = recipeInput.length;
            const w = recipeInput[0]?.length ?? 0;

            for (let oy = 0; oy <= size - h; oy++) {
                for (let ox = 0; ox <= size - w; ox++) {
                    const normal = matchesShaped(grid, recipeInput, ox, oy, false);
                    const flipped = matchesShaped(grid, recipeInput, ox, oy, true);

                    if (normal || flipped) {
                        if (!allOtherCellsEmpty(grid, ox, oy, w, h)) continue;

                        return {
                            output: { ...recipe.output },
                            secondary: resolveSecondaryOutput(inputSlots, recipe, size, ox, oy, flipped)
                        };
                    }
                }
            }
        }
    }

    return { output: null, secondary: null };
}
