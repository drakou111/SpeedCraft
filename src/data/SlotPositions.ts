const SLOT = 64;
const OFFSET_X = 25;
const OFFSET_Y = 295;
const ROWS = 3;
const COLS = 9;

export const slotPositions: Record<number, { x: number; y: number }> = {};

// --- Inventory main grid (0..26) ---
for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    const idx = r * COLS + c;
    slotPositions[idx] = {
      x: OFFSET_X + c * SLOT,
      y: OFFSET_Y + r * SLOT,
    };
  }
}

// --- Hotbar row (27..35) ---
const HOTBAR_Y = OFFSET_Y + 3 * SLOT + 14;
for (let c = 0; c < COLS; c++) {
  const idx = 27 + c;
  slotPositions[idx] = {
    x: OFFSET_X + c * SLOT,
    y: HOTBAR_Y,
  };
}

// --- Offhand (36) ---
slotPositions[36] = {
  x: OFFSET_X,
  y: OFFSET_Y - SLOT - 14,
};

// --- Crafting grid (37..45) ---
const CRAFT_X = 103;
const CRAFT_Y = 56.8;

for (let r = 0; r < 3; r++) {
  for (let c = 0; c < 3; c++) {
    const idx = 37 + r * 3 + c;
    slotPositions[idx] = {
      x: CRAFT_X + c * SLOT,
      y: CRAFT_Y + r * SLOT,
    };
  }
}

// --- Output slot (46) ---
slotPositions[46] = {
  x: 437.5,
  y: 120.5,
};

