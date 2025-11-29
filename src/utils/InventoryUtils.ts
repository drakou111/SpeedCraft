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

export const SHIFT_ROUTES: Record<SlotType, SlotType[]> = {
  [SlotType.INPUT]: [SlotType.INVENTORY, SlotType.HOTBAR],
  [SlotType.OUTPUT]: [SlotType.HOTBAR, SlotType.INVENTORY],
  [SlotType.HOTBAR]: [SlotType.INPUT, SlotType.INVENTORY],
  [SlotType.INVENTORY]: [SlotType.INPUT, SlotType.HOTBAR],
  [SlotType.OFFHAND]: []
};

export function getAllItemsAsArray(slots: Slot[]): Item[] {
  const items: Item[] = [];

  for (const slot of slots) {
    if (slot.type !== "OUTPUT" && slot.item) {
      items.push(slot.item);
    }
  }

  return items;
}

export function getShiftClickOrder(slots: Slot[], clickedIdx: number, reverseOrder: boolean = false, overrideType: SlotType | null = null): number[] {
  const clicked = slots[clickedIdx];
  if (!clicked) return [];

  let routes = SHIFT_ROUTES[overrideType ? overrideType : clicked.type];

  // Special behaviour
  if (overrideType && overrideType == SlotType.INVENTORY) {
    routes = [SlotType.INPUT, SlotType.INVENTORY];
  }

  if (!routes || routes.length === 0) return [];

  const order: number[] = [];

  for (const targetType of routes) {
    const subOrder: number[] = [];
    for (let i = 0; i < slots.length; i++) {
      if (i === clickedIdx) continue;

      const s = slots[i];
      if (s.type === targetType) {
        subOrder.push(i);
      }
    }

    if (reverseOrder)
      subOrder.reverse();

    order.push(...subOrder);
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

export function distributeIntoSlotsOnlyIfSame(
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
    if (!s.item) continue;

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
  firstOrder: number[],
  secondOrder: number[],
  reverse: boolean = false,
  item: Item,
  count: number,
): { success: boolean; after: Slot[]; remaining: number; placed: number } {

  const cp: Slot[] = slotsArr.map((s) => ({
    type: s.type,
    item: s.item ? { ...s.item } : null
  }));

  let remaining = count;
  let placed = 0;

  if (reverse) {
    const { remaining: remain1, placed: placed1 } = distributeIntoSlots(cp, firstOrder, item, remaining);
    const { remaining: remain2, placed: placed2 } = distributeIntoSlotsOnlyIfSame(cp, secondOrder, item, remain1);
    remaining = remain2;
    placed = placed1 + placed2;
  } else {
    const { remaining: remain1, placed: placed1 } = distributeIntoSlotsOnlyIfSame(cp, firstOrder, item, remaining);
    const { remaining: remain2, placed: placed2 } = distributeIntoSlots(cp, secondOrder, item, remain1);
    remaining = remain2;
    placed = placed1 + placed2;
  }

  return { success: remaining === 0, after: cp, remaining, placed };
}

