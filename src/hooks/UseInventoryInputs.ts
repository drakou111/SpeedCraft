// src/hooks/useInventoryInput.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Item } from "../types/Item";
import type { Slot } from "../types/Slot";
import { getCraftingResult } from "../utils/CraftingUtils";
import {
  playPickupSound,
  playPutDownSound,
  playSwapSound,
  playDragSound,
} from "../utils/SoundUtils";
import {
  getShiftClickOrder,
  distributeIntoSlots,
  distributeEvenlyToSlots,
  distributeOneByOne,
  getSlotIndex,
} from "../utils/InventoryUtils";

export type InventoryInputState = {
  leftDown: boolean;
  rightDown: boolean;
  heldItem: Item | null;
  draggingLeft: boolean;
  draggingRight: boolean;
  dragStartIndex: number | null;
  dragCurrentIndex: number | null;
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
  const { preventContextMenu = true, slots, setSlots, inventorySlots, hotbarSlots, craftingSlots } = options;

  // mouse states
  const [leftDown, setLeftDown] = useState(false);
  const [rightDown, setRightDown] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // held item
  const [heldItem, setHeldItem] = useState<Item | null>(null);

  // drag indices
  const [dragStartIndex, setDragStartIndex] = useState<number | null>(null);
  const [dragCurrentIndex, setDragCurrentIndex] = useState<number | null>(
    null
  );

  const [dragLeft, setDragLeft] = useState(false);
  const [dragRight, setDragRight] = useState(false);

  const [selectedSlots, setSelectedSlots] = useState<number[]>([]);
  const hoveredSlotsRef = useRef<Set<number>>(new Set());

  // double-click helpers
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

  // hotkeys map
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

  // runDoubleClick
  const runDoubleClick = useCallback(() => {
    if (!heldItem) return;
    const targetId = heldItem.id;
    const maxStack = heldItem.stack_size;
    if (heldItem.count >= maxStack) return;

    let needed = maxStack - heldItem.count;
    if (needed <= 0) return;

    const next = [...slots];
    let takenTotal = 0;

    for (let i = 0; i < next.length; i++) {
      const s = next[i];
      if (s.output) continue
      if (!s?.item) continue;
      if (s.item.id !== targetId) continue;
      if (needed <= 0) break;

      const take = Math.min(s.item.count, needed);
      if (take <= 0) continue;

      const remainInSlot = s.item.count - take;
      if (remainInSlot > 0)
        next[i] = { ...next[i], item: { ...s.item, count: remainInSlot } };
      else next[i] = { ...next[i], item: null };

      takenTotal += take;
      needed -= take;
    }

    if (takenTotal > 0) {
      setSlots(next);
      const newHeldCount = heldItem.count + takenTotal;
      setHeldItem({ ...heldItem, count: Math.min(newHeldCount, maxStack) });
    }
  }, [heldItem, slots, setSlots]);

  // hotkey listener uses stored mouse pos and helper getSlotIndex
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
  }, [mousePos, slots, heldItem, dragCurrentIndex]); // keep deps minimal but include mousePos


  useEffect(() => {
    const inputSlots = slots.slice(inputStart, inputEnd);
    const outputItem = getCraftingResult(inputSlots);

    setSlots(prev => {
      const next = [...prev];
      const outputIdx = inputEnd;
      next[outputIdx] = { ...next[outputIdx], item: outputItem };
      return next;
    });
  }, [slots.slice(inputStart, inputEnd).map(s => s.item?.id + ":" + s.item?.count).join(",")]);

  // compute a visual preview (pure, no state mutation) while dragging
  const { previewSlots, previewHeldItem } = useMemo(() => {
    // Not dragging or no held item => no preview
    if (!heldItem || (!dragLeft && !dragRight) || selectedSlots.length === 0) {
      return { previewSlots: undefined, previewHeldItem: undefined };
    }

    // Make deep-ish copy of slots array (slot objects and item objects)
    const copy = slots.map((s) =>
      s
        ? {
          ...s,
          item: s.item ? { ...s.item } : null,
        }
        : { item: null }
    );

    // order is selectedSlots in the order user traversed them (hoveredSlotsRef)
    const valid = selectedSlots.filter((i) => i >= 0 && i < copy.length);

    // helper to compute only-on-preview results
    if (dragLeft) {
      // left-drag = split evenly if possible, otherwise one-per-slot when perSlot===0
      const perSlot = Math.floor(heldItem.count / valid.length);
      if (perSlot > 0) {
        // use distributeEvenlyToSlots but on our copy (must be pure)
        const { next: after, placed } = distributeEvenlyToSlots(
          copy.map((c) => ({ ...c, item: c.item ? { ...c.item } : null })),
          valid,
          heldItem
        );
        const previewHeld =
          placed >= heldItem.count
            ? null
            : { ...heldItem, count: Math.max(0, heldItem.count - placed) };
        return { previewSlots: after, previewHeldItem: previewHeld };
      } else {
        // one-per-slot
        const { next: after, remaining } = distributeOneByOne(
          copy.map((c) => ({ ...c, item: c.item ? { ...c.item } : null })),
          valid,
          heldItem
        );
        const previewHeld =
          remaining > 0 ? { ...heldItem, count: remaining } : null;
        return { previewSlots: after, previewHeldItem: previewHeld };
      }
    } else {
      // dragRight: give one per slot (only to valid slots)
      const { next: after, remaining } = distributeOneByOne(
        copy.map((c) => ({ ...c, item: c.item ? { ...c.item } : null })),
        valid,
        heldItem
      );
      const previewHeld = remaining > 0 ? { ...heldItem, count: remaining } : null;
      return { previewSlots: after, previewHeldItem: previewHeld };
    }
  }, [heldItem, dragLeft, dragRight, selectedSlots, slots]);

  function handleOutputClick(outputIdx: number) {
    const outputSlot = slots[outputIdx];
    if (!outputSlot.item) return; // nothing to pick up

    const inputSlots = slots.slice(inputStart, inputEnd);
    const resultItem = getCraftingResult(inputSlots);
    if (!resultItem) return;

    // Determine if held item allows pickup
    if (!heldItem) {
      setHeldItem({ ...resultItem });
    } else if (heldItem.id !== resultItem.id || heldItem.count + resultItem.count > heldItem.stack_size) {
      return; // cannot take
    } else {
      setHeldItem({ ...heldItem, count: heldItem.count + resultItem.count });
    }
    playSwapSound();

    // Remove 1 from each input slot
    setSlots(prev => {
      const next = [...prev];
      for (let i = inputStart; i < inputEnd; i++) {
        const s = next[i];
        if (!s.item) continue;
        const count = s.item.count - 1;
        next[i] = { ...s, item: count > 0 ? { ...s.item, count } : null };
      }
      // Recompute output
      const newOutput = getCraftingResult(next.slice(inputStart, inputEnd));
      next[outputIdx] = { ...next[outputIdx], item: newOutput };
      return next;
    });
  }

  function handleShiftClickOutput(outputIdx: number) {
    const outputSlot = slots[outputIdx];
    if (!outputSlot.item) return;
    let didMove = false;
    setSlots(prevSlots => {
      let next = [...prevSlots];
      let done = false;

      while (!done) {
        const outputSlot = next[outputIdx];
        if (!outputSlot.item) break;

        const item = outputSlot.item;

        // check if enough space in inventory
      const order = getShiftClickOrder(next, outputIdx, true);
      const { next: after, remaining, placed } = distributeIntoSlots(next, order, item, item.count);
      // If not all items fit, stop and do not modify inventory
      if (remaining && remaining > 0) break;

      // Only commit if all items fit
      next = after;
      if (placed > 0) didMove = true;
        // remove 1 from each input slot
        for (let i = inputStart; i < inputEnd; i++) {
          const s = after[i];
          if (!s.item) continue;
          const count = s.item.count - 1;
          after[i] = { ...s, item: count > 0 ? { ...s.item, count } : null };
        }

        // recompute output
        const newOutput = getCraftingResult(after.slice(inputStart, inputEnd));
        after[outputIdx] = { ...after[outputIdx], item: newOutput };

        if (!newOutput || newOutput.id !== item.id) break;

        next = after;
      }

      return next;
    });
    if (didMove) playSwapSound();
  }


  // SHIFT-click functions (unchanged but using helper utilities)
  function shiftClickSlots(clickedIdx: number, item: Item | null) {
    if (!item) return;
    const itemId = item.id;

    const next = [...slots];
    let totalToDistribute = 0;
    for (let i = 0; i < next.length; i++) {
      const s = next[i];
      if (s?.item?.id === itemId) {
        totalToDistribute += s.item.count;
        next[i] = { ...s, item: null };
      }
    }

    const order = getShiftClickOrder(slots, clickedIdx);
    const { next: after } = distributeIntoSlots(
      next,
      order,
      item,
      totalToDistribute
    );
    setSlots(after);
  }

  function shiftClickSlot(idx: number) {
    const slot = slots[idx];
    if (!slot?.item) return;

    playSwapSound();
    const item = slot.item;
    const next = [...slots];
    let totalToDistribute = item.count;
    next[idx] = { ...slot, item: null };

    const order = getShiftClickOrder(slots, idx);
    const { next: after } = distributeIntoSlots(
      next,
      order,
      item,
      totalToDistribute
    );
    setSlots(after);
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
        const next = [...prev];
        next[sel] = { ...next[sel], item: sHot.item };
        next[hot] = { ...next[hot], item: null };
        return next;
      });
      playSwapSound();
      return;
    }

    if (!sHot.item && sSel.item) {
      setSlots((prev) => {
        const next = [...prev];
        next[hot] = { ...next[hot], item: sSel.item };
        next[sel] = { ...next[sel], item: null };
        return next;
      });
      playSwapSound();
      return;
    }

    if (sHot.item && sSel.item) {
      setSlots((prev) => {
        const next = [...prev];
        next[hot] = sSel;
        next[sel] = sHot;
        return next;
      });
      playSwapSound();
      return;
    }
  }

  // compute selection while dragging: keep hovered order
  useEffect(() => {
    if (dragLeft || dragRight) {
      setSelectedSlots(Array.from(hoveredSlotsRef.current));
    } else {
      setSelectedSlots([]);
      hoveredSlotsRef.current.clear();
    }
  }, [dragLeft, dragRight, dragStartIndex, dragCurrentIndex]);

  // handlers (I left them as you already had; they update hoveredSlotsRef and selectedSlots)
  function onMouseDown(e: React.MouseEvent) {
    const idx = getSlotIndex(slotRefs.current, mousePos.x, mousePos.y);
    setDoubleClick(false);

    if (idx !== null && slots[idx]?.hidden) return;

    if (idx !== null && slots[idx]?.output) {
      if (e.shiftKey) {
        handleShiftClickOutput(idx);
      } else {
        handleOutputClick(idx);
      }
      return
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
        setDragCurrentIndex(idx);
      } else {
        if (idx !== null) {
          const s = slots[idx];
          if (s?.item) {
            setHeldItem(s.item);
            playPickupSound();
            setSlots((prev) => {
              const next = [...prev];
              next[idx] = { ...next[idx], item: null };
              return next;
            });
            setDragStartIndex(null);
            setDragCurrentIndex(null);
          } else {
            setDragStartIndex(idx);
            setDragCurrentIndex(idx);
          }
        } else {
          setDragStartIndex(null);
          setDragCurrentIndex(null);
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
        setDragCurrentIndex(idx);
      } else {
        if (idx !== null) {
          const s = slots[idx];
          if (s?.item) {
            const take = Math.ceil(s.item.count / 2);
            const remain = s.item.count - take;
            setHeldItem({ ...s.item, count: take });
            playPickupSound();
            setSlots((prev) => {
              const next = [...prev];
              next[idx] =
                remain > 0
                  ? { ...next[idx], item: { ...(s.item as Item), count: remain } }
                  : { ...next[idx], item: null };
              return next;
            });
            setDragStartIndex(null);
            setDragCurrentIndex(null);
          } else {
            setDragStartIndex(idx);
            setDragCurrentIndex(idx);
          }
        } else {
          setDragStartIndex(null);
          setDragCurrentIndex(null);
        }
      }
    } else if (!dragLeft && !dragRight) {
      setDragStartIndex(idx);
      setDragCurrentIndex(idx);
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
          const next = [...prev];
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
            const next = [...prev];
            const { next: after, placed } = distributeEvenlyToSlots(
              next,
              valid,
              heldItem
            );
            totalPlaced = placed;
            return after;
          });
          const remaining = heldItem.count - totalPlaced;
          if (remaining > 0) setHeldItem({ ...heldItem, count: remaining });
          else setHeldItem(null);
        } else {
          // one-per-slot distribution
          let remaining = heldItem.count;
          setSlots((prev) => {
            const next = [...prev];
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
          const next = [...prev];
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
    if (slots[idx]?.hidden) return;

    if ((dragLeft || dragRight) && heldItem) {
      if (!hoveredSlotsRef.current.has(idx)) {
        playDragSound();
        hoveredSlotsRef.current.add(idx);
        setSelectedSlots([...hoveredSlotsRef.current]);
      }
    }

    setDragCurrentIndex(idx);
  }

  function onContextMenu(e: React.MouseEvent) {
    if (preventContextMenu) e.preventDefault();
  }

  const setHeld = useCallback((it: Item | null) => setHeldItem(it), []);

  const resetDrag = useCallback(() => {
    setDragStartIndex(null);
    setDragCurrentIndex(null);
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
    dragCurrentIndex,
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
    setHeld,
    resetDrag,
  };

  return { state, handlers };
}
