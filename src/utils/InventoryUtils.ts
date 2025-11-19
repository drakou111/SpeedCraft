// src/utils/inventoryUtils.ts
import type { Item } from "../types/Item";
import type { Slot } from "../types/Slot";
import { SlotType } from "../types/Slot";

/**
 * Collect indices and total count of all slots containing itemId.
 */
export function collectSameItems(slots: Slot[], itemId: string) {
  const indices: number[] = [];
  let total = 0;
  for (let i = 0; i < slots.length; i++) {
    const s = slots[i];
    if (s?.item && s.item.id === itemId) {
      indices.push(i);
      total += s.item.count;
    }
  }
  return { indices, total };
}

const SHIFT_ROUTES: Record<SlotType, SlotType[]> = {
  [SlotType.INPUT]:  [SlotType.INVENTORY, SlotType.HOTBAR],
  [SlotType.OUTPUT]: [SlotType.HOTBAR, SlotType.INVENTORY],
  [SlotType.HOTBAR]: [SlotType.INPUT, SlotType.INVENTORY],
  [SlotType.INVENTORY]: [SlotType.INPUT, SlotType.HOTBAR],
  [SlotType.OFFHAND]: []
};

export function getShiftClickOrder(slots: Slot[], clickedIdx: number): number[] {
  const clicked = slots[clickedIdx];
  if (!clicked) return [];

  const routes = SHIFT_ROUTES[clicked.type];
  if (!routes || routes.length === 0) return [];

  const order: number[] = [];

  for (const targetType of routes) {
    for (let i = 0; i < slots.length; i++) {
      if (i === clickedIdx) continue;

      const s = slots[i];
      if (s.type === targetType) {
        order.push(i);
      }
    }
  }

  return order;
}

export function distributeIntoSlots(
  next: Slot[],
  order: number[],
  item: Item,
  total: number
) {
  let remaining = total;
  let placed = 0;
  const id = item.id;
  const maxStack = item.stack_size;

  for (const idx of order) {
    if (remaining <= 0) break;
    const s = next[idx];
    // skip if slot contains a different item
    if (s.item && s.item.id !== id) continue;

    const existing = s.item?.count ?? 0;
    const capacity = Math.max(0, maxStack - existing);
    if (capacity <= 0) continue;

    const toPlace = Math.min(capacity, remaining);

    if (s.item) next[idx] = { ...s, item: { ...s.item, count: existing + toPlace } };
    else next[idx] = { ...s, item: { ...item, count: toPlace } };

    remaining -= toPlace;
    placed += toPlace;
  }

  return { next, remaining, placed };
}

/**
 * Even-split distribution (used for left-drag when perSlot >= 1).
 * Will try to give each valid slot `perSlot` then clamp to capacity.
 * Returns { next, placed } where next is mutated copy and placed total amount.
 */
export function distributeEvenlyToSlots(next: Slot[], valid: number[], heldItem: Item) {
  const maxStack = heldItem.stack_size;
  const perSlot = Math.floor(heldItem.count / valid.length);
  if (perSlot <= 0) return { next, placed: 0 };

  let placed = 0;
  for (const idx of valid) {
    const s = next[idx];
    if (s.type == SlotType.OUTPUT) continue;
    const existing = s.item?.count ?? 0;
    const capacity = Math.max(0, maxStack - existing);
    const toPlace = Math.min(perSlot, capacity);
    if (toPlace <= 0) continue;

    if (s.item) next[idx] = { ...s, item: { ...s.item, count: existing + toPlace } };
    else next[idx] = { ...s, item: { ...heldItem, count: toPlace } };

    placed += toPlace;
  }

  return { next, placed };
}

/**
 * One-per-slot distribution (used when perSlot < 1)
 * Fills valid slots one by one up to remaining count.
 * Returns { next, placed, remaining }.
 */
export function distributeOneByOne(next: Slot[], valid: number[], heldItem: Item) {
  const maxStack = heldItem.stack_size;
  let remaining = heldItem.count;
  const toApply: Record<number, number> = {};

  for (const idx of valid) {
    if (remaining <= 0) break;
    const s = next[idx];
    if (s.type == SlotType.OUTPUT) continue;
    const existing = s.item?.count ?? 0;
    const capacity = Math.max(0, maxStack - existing);
    if (capacity <= 0) continue;
    toApply[idx] = (toApply[idx] ?? 0) + 1;
    remaining -= 1;
  }

  let placed = 0;
  for (const k in toApply) {
    const idx = Number(k);
    const add = toApply[idx];
    const s = next[idx];
    if (s.item) next[idx] = { ...s, item: { ...s.item, count: s.item.count + add } };
    else next[idx] = { ...s, item: { ...heldItem, count: add } };
    placed += add;
  }

  return { next, placed, remaining };
}

/**
 * Returns slot index under mouse using slot refs.
 */
export function getSlotIndex(slotRefs: Array<HTMLDivElement | null>, x: number, y: number) {
  for (let i = 0; i < slotRefs.length; i++) {
    const el = slotRefs[i];
    if (!el) continue;
    const rect = el.getBoundingClientRect();
    if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
      return i;
    }
  }
  return null;
}

export function tryPlaceAllTwoPass(
  slotsArr: Slot[],
  order: number[],
  item: Item,
  count: number
): { success: boolean; after: Slot[]; remaining: number; placed: number } {

  const cp: Slot[] = slotsArr.map((s) => ({
    type: s.type,
    item: s.item ? { ...s.item } : null
  }));

  let remaining = count;
  let placed = 0;
  const maxStack = item.stack_size;

  for (const i of order) {
    if (remaining <= 0) break;
    const s = cp[i];
    if (!s.item) continue;
    if (s.item.id !== item.id) continue;

    const capacity = Math.max(0, maxStack - s.item.count);
    if (capacity <= 0) continue;

    const toPlace = Math.min(capacity, remaining);
    s.item.count += toPlace;
    remaining -= toPlace;
    placed += toPlace;
  }

  for (const i of order) {
    if (remaining <= 0) break;
    const s = cp[i];
    if (s.item) continue;

    const toPlace = Math.min(maxStack, remaining);
    cp[i] = { type: s.type, item: { ...item, count: toPlace } };
    remaining -= toPlace;
    placed += toPlace;
  }

  return { success: remaining === 0, after: cp, remaining, placed };
}

