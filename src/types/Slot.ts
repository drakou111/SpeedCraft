import type { Item } from "./Item"

export const SlotType = {
  INPUT: "INPUT",
  OUTPUT: "OUTPUT",
  HOTBAR: "HOTBAR",
  INVENTORY: "INVENTORY",
  OFFHAND: "OFFHAND"
} as const;

export type SlotType = typeof SlotType[keyof typeof SlotType];

export type Slot = {
  item: Item | null;
  type: SlotType;
};