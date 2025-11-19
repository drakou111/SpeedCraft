// src/utils/CraftingUtils.ts
import type { Slot } from "../types/Slot";
import { recipes } from "../types/Recipe";

/**
 * Check if a shaped recipe matches the grid at a given top-left offset
 * Supports horizontal flip
 */
function matchesShaped(
    grid: (string | null)[][],
    recipeInput: (string | null)[][],
    offsetX: number,
    offsetY: number,
    flipped = false
): boolean {
    const recipeHeight = recipeInput.length;
    const recipeWidth = recipeInput[0]?.length ?? 0;
    const gridSize = grid.length;

    for (let y = 0; y < recipeHeight; y++) {
        for (let x = 0; x < recipeWidth; x++) {
            const recipeId = flipped
                ? recipeInput[y][recipeWidth - 1 - x]
                : recipeInput[y][x];
            const gridY = offsetY + y;
            const gridX = offsetX + x;

            if (gridY >= gridSize || gridX >= gridSize) return false;

            if ((grid[gridY][gridX] ?? null) !== (recipeId ?? null)) return false;
        }
    }

    return true;
}

/**
 * Check for a shapeless recipe
 */
function matchesShapeless(
    gridIdsFlat: (string | null)[],
    recipeInput: (string | null)[]
): boolean {
    const gridItems = gridIdsFlat.filter(Boolean) as string[];
    const recipeItems = recipeInput.filter(Boolean) as string[];

    if (gridItems.length !== recipeItems.length) return false;

    // Check if all recipe items exist in the grid (order doesn't matter)
    const gridCopy = [...gridItems];
    for (const item of recipeItems) {
        const idx = gridCopy.indexOf(item);
        if (idx === -1) return false;
        gridCopy.splice(idx, 1);
    }
    return true;
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

/**
 * Returns the resulting item for the given crafting input grid
 */
export function getCraftingResult(inputSlots: Slot[]): Slot["item"] | null {
    const size = Math.sqrt(inputSlots.length);
    const grid: (string | null)[][] = [];

    for (let y = 0; y < size; y++) {
        const row: (string | null)[] = [];
        for (let x = 0; x < size; x++) {
            const slot = inputSlots[y * size + x];
            row.push(slot.item?.id ?? null);
        }
        grid.push(row);
    }

    for (const recipe of recipes) {
        if (recipe.type === "SHAPELESS") {
            if (matchesShapeless(inputSlots.map(s => s.item?.id ?? null), recipe.input as (string | null)[])) {
                return { ...recipe.output };
            }
        } else if (recipe.type === "SHAPED") {
            const recipeHeight = recipe.input.length;
            const recipeWidth = recipe.input[0]?.length ?? 0;

            // Try all positions in the grid where top-left of recipe could be
            for (let offsetY = 0; offsetY <= size - recipeHeight; offsetY++) {
                for (let offsetX = 0; offsetX <= size - recipeWidth; offsetX++) {
                    const shapedNormally = matchesShaped(grid, recipe.input as (string | null)[][], offsetX, offsetY, false);
                    const shapedFlipped = matchesShaped(grid, recipe.input as (string | null)[][], offsetX, offsetY, true);

                    if (shapedNormally || shapedFlipped) {
                        if (allOtherCellsEmpty(grid, offsetX, offsetY, recipeWidth, recipeHeight)) {
                            return { ...recipe.output };
                        }
                    }
                }
            }
        }
    }

    return null;
}
