import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Item } from "../types/Item";
import { SlotType, type Slot } from "../types/Slot";
import { getCraftingResult } from "../utils/CraftingUtils";
import {
  playPickupSound,
  playPutDownSound,
  playSwapSound,
  playDragSound,
} from "../utils/SoundUtils";
import {
  getShiftClickOrder,
  distributeEvenlyToSlots,
  distributeOneByOne,
  getSlotIndex,
  tryPlaceAllTwoPass,
} from "../utils/InventoryUtils";

export type InventoryInputState = {
  leftDown: boolean;
  rightDown: boolean;
  heldItem: Item | null;
  draggingLeft: boolean;
  draggingRight: boolean;
  dragStartIndex: number | null;
  hoverIndex: number | null;
  selectedSlots: number[];
  doubleClick: boolean;
  previewSlots?: Array<Slot>;
  previewHeldItem?: Item | null;
};

export function useInventoryInput(options: {
  preventContextMenu?: boolean;
  slots: Array<Slot>;
  setSlots: React.Dispatch<React.SetStateAction<Array<Slot>>>;
  inventorySlots: number;
  hotbarSlots: number;
  craftingSlots: number;
}) {
  const {
    preventContextMenu = true,
    slots,
    setSlots,
    inventorySlots,
    hotbarSlots,
    craftingSlots,
  } = options;

  // safe clone: always returns a valid Slot (preserves type)
  const cloneSlot = (s: Slot): Slot => ({
    type: s.type,
    item: s.item ? { ...s.item } : null,
  });

  const [leftDown, setLeftDown] = useState(false);
  const [rightDown, setRightDown] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const [heldItem, setHeldItem] = useState<Item | null>(null);

  const [dragStartIndex, setDragStartIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const [dragLeft, setDragLeft] = useState(false);
  const [dragRight, setDragRight] = useState(false);

  const [selectedSlots, setSelectedSlots] = useState<number[]>([]);
  const hoveredSlotsRef = useRef<Set<number>>(new Set());

  // double click
  const lastLeftDownRef = useRef<number | null>(null);
  const [doubleClick, setDoubleClick] = useState(false);
  const [doubleClickSlot, setDoubleClickSlot] = useState<number | null>(null);
  const DOUBLE_CLICK_MS = 175;

  const inputStart = inventorySlots + hotbarSlots;
  const inputEnd = inputStart + craftingSlots;

  // shift-click helpers
  const [shiftClicked, setShiftClicked] = useState(false);
  const [shiftClickItem, setShiftClickItem] = useState<Item | null>(null);

  // DOM refs
  const containerRef = useRef<HTMLElement | null>(null);
  const slotRefs = useRef<Array<HTMLDivElement | null>>(
    slots.map(() => null)
  );

  // hotkeys
  const hotkeyBindings: Record<string, number> = {
    Digit1: inventorySlots,
    Digit2: inventorySlots + 1,
    Digit3: inventorySlots + 2,
    Digit4: inventorySlots + 3,
    Digit5: inventorySlots + 4,
    Digit6: inventorySlots + 5,
    Digit7: inventorySlots + 6,
    Digit8: inventorySlots + 7,
    Digit9: inventorySlots + 8,
    KeyF: inventorySlots + hotbarSlots + craftingSlots + 1,
  };

  const runDoubleClick = useCallback(() => {
    if (!heldItem) return;
    const targetId = heldItem.id;
    const maxStack = heldItem.stack_size;
    if (heldItem.count >= maxStack) return;

    let needed = maxStack - heldItem.count;
    if (needed <= 0) return;

    const next = slots.map(cloneSlot);
    let takenTotal = 0;

    for (let i = 0; i < next.length; i++) {
      const s = next[i];
      if (s.type === SlotType.OUTPUT) continue;
      if (!s.item) continue;
      if (s.item.id !== targetId) continue;
      if (needed <= 0) break;

      const take = Math.min(s.item.count, needed);
      if (take <= 0) continue;

      const remainInSlot = s.item.count - take;
      if (remainInSlot > 0) next[i] = { ...next[i], item: { ...s.item, count: remainInSlot } };
      else next[i] = { ...next[i], item: null };

      takenTotal += take;
      needed -= take;
    }

    if (takenTotal > 0) {
      setSlots(next);
      playSwapSound();
      const newHeldCount = heldItem.count + takenTotal;
      setHeldItem({ ...heldItem, count: Math.min(newHeldCount, maxStack) });
    }
  }, [heldItem, slots, setSlots]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const code = e.code;
      if (hotkeyBindings[code] != null) {
        e.preventDefault();
        const hotbarIdx = hotkeyBindings[code];
        const idx = getSlotIndex(slotRefs.current, mousePos.x, mousePos.y);
        runHotkey(hotbarIdx, idx);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mousePos, slots, heldItem, hoverIndex]); // keep deps minimal but include mousePos

  useEffect(() => {
    // compute output based on input slice
    const inputSlots = slots.slice(inputStart, inputEnd);
    const outputItem = getCraftingResult(inputSlots);

    setSlots((prev) => {
      const next = prev.slice();
      const outputIdx = inputEnd;
      next[outputIdx] = { ...next[outputIdx], item: outputItem };
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots
    .slice(inputStart, inputEnd)
    .map((s) => `${s.item?.id ?? "null"}:${s.item?.count ?? 0}`)
    .join(",")]);

  const { previewSlots, previewHeldItem } = useMemo(() => {
    if (!heldItem || (!dragLeft && !dragRight) || selectedSlots.length === 0) {
      return { previewSlots: undefined, previewHeldItem: undefined };
    }

    // deep-ish clone of slots (valid Slot[])
    const copy = slots.map(cloneSlot);

    const valid = selectedSlots.filter((i) => i >= 0 && i < copy.length);

    if (valid.length === 0) {
      return { previewSlots: undefined, previewHeldItem: undefined };
    }

    if (dragLeft) {
      const perSlot = Math.floor(heldItem.count / valid.length);
      if (perSlot > 0) {
        const { next: after, placed } = distributeEvenlyToSlots(copy, valid, heldItem);
        const previewHeld = placed >= heldItem.count ? null : { ...heldItem, count: Math.max(0, heldItem.count - placed) };
        return { previewSlots: after, previewHeldItem: previewHeld };
      } else {
        const { next: after, remaining } = distributeOneByOne(copy, valid, heldItem);
        const previewHeld = remaining > 0 ? { ...heldItem, count: remaining } : null;
        return { previewSlots: after, previewHeldItem: previewHeld };
      }
    } else {
      // right-drag
      const { next: after, remaining } = distributeOneByOne(copy, valid, heldItem);
      const previewHeld = remaining > 0 ? { ...heldItem, count: remaining } : null;
      return { previewSlots: after, previewHeldItem: previewHeld };
    }
  }, [heldItem, dragLeft, dragRight, selectedSlots, slots]);

  function handleOutputClick(outputIdx: number) {
    const outputSlot = slots[outputIdx];
    if (!outputSlot.item) return;

    const inputSlots = slots.slice(inputStart, inputEnd);
    const resultItem = getCraftingResult(inputSlots);
    if (!resultItem) return;

    // held interactions
    if (!heldItem) {
      setHeldItem({ ...resultItem });
    } else if (heldItem.id !== resultItem.id || heldItem.count + resultItem.count > heldItem.stack_size) {
      return;
    } else {
      setHeldItem({ ...heldItem, count: heldItem.count + resultItem.count });
    }
    playSwapSound();

    // remove 1 from each input slot
    setSlots((prev) => {
      const next = prev.slice();
      for (let i = inputStart; i < inputEnd; i++) {
        const s = next[i];
        if (!s.item) continue;
        const count = s.item.count - 1;
        next[i] = { ...s, item: count > 0 ? { ...s.item, count } : null };
      }
      const newOutput = getCraftingResult(next.slice(inputStart, inputEnd));
      next[outputIdx] = { ...next[outputIdx], item: newOutput };
      return next;
    });
  }

  function handleShiftClickOutput(outputIdx: number) {
    const outputSlot = slots[outputIdx];
    if (!outputSlot?.item) return;

    let didMove = false;

    setSlots((prevSlots) => {
      let next = prevSlots.slice();

      while (true) {
        const curOutput = next[outputIdx];
        if (!curOutput?.item) break;

        const item = curOutput.item;
        const order = getShiftClickOrder(next, outputIdx);

        const { success, after, remaining, placed } = tryPlaceAllTwoPass(next, order, item, item.count);

        if (!success) break;

        // clone all slots in after safely
        let afterCopy = after.map(cloneSlot);

        for (let i = inputStart; i < inputEnd; i++) {
          const s = afterCopy[i];
          if (!s?.item) continue;
          const newCount = s.item.count - 1;
          afterCopy[i] = { ...s, item: newCount > 0 ? { ...s.item, count: newCount } : null };
        }

        const newOutput = getCraftingResult(afterCopy.slice(inputStart, inputEnd));
        afterCopy[outputIdx] = { ...afterCopy[outputIdx], item: newOutput };

        next = afterCopy;
        if (placed > 0) didMove = true;

        if (!newOutput || newOutput.id !== item.id) break;
      }

      return next;
    });

    if (didMove) playSwapSound();
  }

  function shiftClickSlots(clickedIdx: number, item: Item | null) {
    if (!item) return;
    const itemId = item.id;

    const next = slots.map(cloneSlot);
    let totalToDistribute = 0;
    for (let i = 0; i < next.length; i++) {
      const s = next[i];
      if (s.item?.id === itemId) {
        totalToDistribute += s.item.count;
        next[i] = { ...s, item: null };
      }
    }

    const order = getShiftClickOrder(slots, clickedIdx);
    const { after: after } = tryPlaceAllTwoPass(next, order, item, totalToDistribute);
    setSlots(after.map(cloneSlot));
  }

  function shiftClickSlot(idx: number) {
    const slot = slots[idx];
    if (!slot?.item) return;

    playSwapSound();
    const item = slot.item;
    const next = slots.map(cloneSlot);
    let totalToDistribute = item.count;
    next[idx] = { ...slot, item: null };

    const order = getShiftClickOrder(slots, idx);
    const { after: after } = tryPlaceAllTwoPass(next, order, item, totalToDistribute);
    setSlots(after.map(cloneSlot));
  }

  function runHotkey(targetIndex: number, idx: number | null) {
    if (heldItem) return;
    if (targetIndex >= slots.length) return;
    if (idx == null) return;

    const sel = idx;
    const hot = targetIndex;
    const sSel = slots[sel];
    const sHot = slots[hot];

    if (sHot.item && !sSel.item) {
      setSlots((prev) => {
        const next = prev.slice();
        next[sel] = { ...next[sel], item: sHot.item };
        next[hot] = { ...next[hot], item: null };
        return next;
      });
      playSwapSound();
      return;
    }

    if (!sHot.item && sSel.item) {
      setSlots((prev) => {
        const next = prev.slice();
        next[hot] = { ...next[hot], item: sSel.item };
        next[sel] = { ...next[sel], item: null };
        return next;
      });
      playSwapSound();
      return;
    }

    if (sHot.item && sSel.item) {
      setSlots((prev) => {
        const next = prev.slice();
        next[hot] = sSel;
        next[sel] = sHot;
        return next;
      });
      playSwapSound();
      return;
    }
  }

  useEffect(() => {
    if (dragLeft || dragRight) {
      setSelectedSlots(Array.from(hoveredSlotsRef.current));
    } else {
      setSelectedSlots([]);
      hoveredSlotsRef.current.clear();
    }
  }, [dragLeft, dragRight, dragStartIndex, hoverIndex]);

  function onMouseDown(e: React.MouseEvent) {
    const idx = getSlotIndex(slotRefs.current, mousePos.x, mousePos.y);
    setDoubleClick(false);

    if (idx !== null && slots[idx]?.type == SlotType.OFFHAND) return;

    if (idx !== null && slots[idx]?.type == SlotType.OUTPUT) {
      if (e.shiftKey) {
        handleShiftClickOutput(idx);
      } else {
        handleOutputClick(idx);
      }
      return;
    }

    if (e.button === 0) {
      const now = performance.now();
      if (
        heldItem &&
        lastLeftDownRef.current !== null &&
        now - lastLeftDownRef.current <= DOUBLE_CLICK_MS &&
        doubleClickSlot === idx
      ) {
        setDoubleClick(true);
        setDoubleClickSlot(null);
        return;
      } else {
        setShiftClicked(false);
        setShiftClickItem(null);
        setDoubleClickSlot(idx);
        lastLeftDownRef.current = now;
      }
    }

    if (idx !== null && e.shiftKey && !doubleClick) {
      setShiftClicked(true);
      setShiftClickItem(slots[idx].item);
      shiftClickSlot(idx);
      setDragLeft(false);
      setDragRight(false);
      return;
    }

    if (e.button === 0 && !dragRight) {
      setLeftDown(true);
      if (heldItem) {
        setDragLeft(true);
        hoveredSlotsRef.current.clear();
        if (idx !== null) hoveredSlotsRef.current.add(idx);
        setSelectedSlots([...hoveredSlotsRef.current]);
        setDragStartIndex(idx);
      } else {
        if (idx !== null) {
          const s = slots[idx];
          if (s?.item) {
            setHeldItem(s.item);
            playPickupSound();
            setSlots((prev) => {
              const next = prev.slice();
              next[idx] = { ...next[idx], item: null };
              return next;
            });
            setDragStartIndex(null);
          } else {
            setDragStartIndex(idx);
          }
        } else {
          setDragStartIndex(null);
        }
      }
    } else if (e.button === 2 && !dragLeft) {
      setRightDown(true);
      if (heldItem) {
        setDragRight(true);
        hoveredSlotsRef.current.clear();
        if (idx !== null) hoveredSlotsRef.current.add(idx);
        setSelectedSlots([...hoveredSlotsRef.current]);
        setDragStartIndex(idx);
      } else {
        if (idx !== null) {
          const s = slots[idx];
          if (s?.item) {
            const take = Math.ceil(s.item.count / 2);
            const remain = s.item.count - take;
            setHeldItem({ ...s.item, count: take });
            playPickupSound();
            setSlots((prev) => {
              const next = prev.slice();
              next[idx] =
                remain > 0
                  ? { ...next[idx], item: { ...(s.item as Item), count: remain } }
                  : { ...next[idx], item: null };
              return next;
            });
            setDragStartIndex(null);
          } else {
            setDragStartIndex(idx);
          }
        } else {
          setDragStartIndex(null);
        }
      }
    } else if (!dragLeft && !dragRight) {
      setDragStartIndex(idx);
    }
  }

  function onMouseUp(e: React.MouseEvent) {
    if (e.button === 0) setLeftDown(false);
    else if (e.button === 2) setRightDown(false);

    const sel = selectedSlots.slice();

    // double click behavior
    if (e.button === 0 && doubleClick) {
      if (sel.length === 1 && (shiftClicked || e.shiftKey)) {
        shiftClickSlots(sel[0], shiftClickItem);
        setShiftClicked(false);
        setShiftClickItem(null);
      } else {
        runDoubleClick();
      }
      resetDrag();
      setDoubleClick(false);
      return;
    }

    setDoubleClick(false);

    // cancel confusing cross-button drags
    if (e.button === 2 && dragLeft && heldItem) {
      setDragLeft(false);
      return;
    }
    if (e.button === 0 && dragRight && heldItem) {
      setDragRight(false);
      return;
    }

    // single-slot swap when dragging and the slot contains a different item
    if ((dragLeft || dragRight) && sel.length === 1 && heldItem) {
      const idx = sel[0];
      const slotItem = slots[idx].item ?? null;
      const different = slotItem !== null && slotItem.id !== heldItem.id;

      if (different) {
        setSlots((prev) => {
          const next = prev.slice();
          next[idx] = { ...next[idx], item: heldItem ? { ...heldItem } : null };
          return next;
        });
        if (slotItem) {
          setHeldItem({ ...slotItem });
          playSwapSound();
        } else {
          setHeldItem(null);
          playPutDownSound();
        }
        setDragLeft(false);
        setDragRight(false);
        resetDrag();
        return;
      }
    }

    // Left-drag distribute (split)
    if (e.button === 0 && dragLeft && heldItem) {
      setDragLeft(false);
      const valid = sel.filter((idx) => {
        const s = slots[idx];
        return s.item === null || (s.item && s.item.id === heldItem.id);
      });

      if (valid.length > 0) {
        playPutDownSound();
        const perSlot = Math.floor(heldItem.count / valid.length);

        if (perSlot > 0) {
          let totalPlaced = 0;
          setSlots((prev) => {
            const next = prev.slice();
            const { next: after, placed } = distributeEvenlyToSlots(next, valid, heldItem);
            totalPlaced = placed;
            return after;
          });
          const remaining = heldItem.count - totalPlaced;
          if (remaining > 0) setHeldItem({ ...heldItem, count: remaining });
          else setHeldItem(null);
        } else {
          let remaining = heldItem.count;
          setSlots((prev) => {
            const next = prev.slice();
            const r = distributeOneByOne(next, valid, heldItem);
            remaining = r.remaining;
            return r.next;
          });
          if (remaining > 0) setHeldItem({ ...heldItem, count: remaining });
          else setHeldItem(null);
        }
      }

      resetDrag();
      return;
    }

    // Right-drag distribute (give one per slot)
    if (e.button === 2 && dragRight && heldItem) {
      setDragRight(false);
      const valid = sel.filter((idx) => {
        const s = slots[idx];
        if (!s.item) return true;
        if (s.item.id !== heldItem.id) return false;
        const maxStack = heldItem.stack_size;
        return s.item.count < maxStack;
      });

      if (valid.length > 0 && heldItem.count > 0) {
        playPutDownSound();
        let remaining = heldItem.count;
        setSlots((prev) => {
          const next = prev.slice();
          const r = distributeOneByOne(next, valid, heldItem);
          remaining = r.remaining;
          return r.next;
        });

        if (remaining > 0) setHeldItem({ ...heldItem, count: remaining });
        else setHeldItem(null);
      }

      resetDrag();
      return;
    }

    resetDrag();
  }

  function onMouseMove(e: React.MouseEvent) {
    setMousePos({ x: e.clientX, y: e.clientY });
    const idx = getSlotIndex(slotRefs.current, e.clientX, e.clientY);
    if (idx === null) return;
    if (slots[idx]?.type === SlotType.OFFHAND) return;

    setHoverIndex(idx);

    if (slots[idx].item && heldItem) {
      if (slots[idx].item.id != heldItem.id) return;
    }

    if ((dragLeft || dragRight) && heldItem) {
      if (!hoveredSlotsRef.current.has(idx)) {

        let used = selectedSlots.length;
        hoveredSlotsRef.current.forEach((sIdx) => {
          const s = slots[sIdx];
          if (!s.item) return;
          if (s.item.id !== heldItem.id || s.item.count === s.item.stack_size) {
            used -= 1;
          }
        });

        // Make sure we still have items to place
        if (used < heldItem.count) {
          playDragSound();
          hoveredSlotsRef.current.add(idx);
          setSelectedSlots([...hoveredSlotsRef.current]);
        }
      }
    }
  }

  function onContextMenu(e: React.MouseEvent) {
    if (preventContextMenu) e.preventDefault();
  }

  const setHeld = useCallback((it: Item | null) => setHeldItem(it), []);

  const resetDrag = useCallback(() => {
    setDragStartIndex(null);
    hoveredSlotsRef.current.clear();
    setSelectedSlots([]);
  }, []);

  const state: InventoryInputState = {
    leftDown,
    rightDown,
    heldItem,
    draggingLeft: dragLeft,
    draggingRight: dragRight,
    dragStartIndex,
    hoverIndex,
    selectedSlots,
    doubleClick,
    previewSlots,
    previewHeldItem,
  };

  const handlers = {
    containerRef,
    slotRefs,
    onMouseDown,
    onMouseUp,
    onMouseMove,
    onContextMenu,
    onMouseLeave: () => setHoverIndex(null),
    setHeld,
    resetDrag,
  };

  return { state, handlers };
}
