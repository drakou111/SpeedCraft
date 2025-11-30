import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Item } from "../types/Item";
import { SlotType, type Slot } from "../types/Slot";
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
  SHIFT_ROUTES,
} from "../utils/InventoryUtils";
import { getCraftingResult } from "../utils/CraftingUtils";
import { useKeybinds } from "../state/KeybindsContext";

export type InventoryInputState = {
  leftDown: boolean;
  rightDown: boolean;
  heldItem: Item | null;
  draggingLeft: boolean;
  draggingRight: boolean;
  firstLeft: boolean;
  firstRight: boolean;
  dragStartIndex: number | null;
  hoverIndex: number | null;
  selectedSlots: number[];
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
  onCraft?: (crafted: Item) => void;
}) {
  const {
    preventContextMenu = true,
    slots,
    setSlots,
    inventorySlots,
    hotbarSlots,
    craftingSlots,
    onCraft
  } = options;

  const cloneSlot = (s: Slot): Slot => ({
    type: s.type,
    item: s.item ? { ...s.item } : null,
  });

  const [leftDown, setLeftDown] = useState(false);
  const [rightDown, setRightDown] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  
  const [firstLeft, setFirstLeft] = useState(false);
  const [firstRight, setFirstRight] = useState(false);

  const [heldItem, setHeldItem] = useState<Item | null>(null);

  const [dragStartIndex, setDragStartIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const [dragLeft, setDragLeft] = useState(false);
  const [dragRight, setDragRight] = useState(false);

  const [selectedSlots, setSelectedSlots] = useState<number[]>([]);
  const hoveredSlotsRef = useRef<Set<number>>(new Set());

  const lastLeftDownRef = useRef<number | null>(null);
  const [doubleClick, setDoubleClick] = useState<boolean>(false);
  const [doubleClickSlot, setDoubleClickSlot] = useState<number | null>(null);
  const [doubleClickItem, setDoubleClickItem] = useState<Item | null>(null);
  const DOUBLE_CLICK_MS = 175;

  const inputStart = inventorySlots + hotbarSlots + 1;
  const inputEnd = inputStart + craftingSlots;

  const containerRef = useRef<HTMLElement | null>(null);
  const slotRefs = useRef<Array<HTMLDivElement | null>>(
    slots.map(() => null)
  );

  const { keybinds } = useKeybinds();
  const hotkeyBindings = useMemo(() => ({
    [keybinds.hotbar1 || "Digit1"]: inventorySlots,
    [keybinds.hotbar2 || "Digit2"]: inventorySlots + 1,
    [keybinds.hotbar3 || "Digit3"]: inventorySlots + 2,
    [keybinds.hotbar4 || "Digit4"]: inventorySlots + 3,
    [keybinds.hotbar5 || "Digit5"]: inventorySlots + 4,
    [keybinds.hotbar6 || "Digit6"]: inventorySlots + 5,
    [keybinds.hotbar7 || "Digit7"]: inventorySlots + 6,
    [keybinds.hotbar8 || "Digit8"]: inventorySlots + 7,
    [keybinds.hotbar9 || "Digit9"]: inventorySlots + 8,
    [keybinds.offhand || "KeyF"]: inventorySlots + hotbarSlots,
  }), [keybinds, inventorySlots, hotbarSlots]);
  const dropKey = keybinds.drop || "KeyQ";


  const runDoubleClick = useCallback(() => {
    if (!heldItem) return;
    const targetId = heldItem.id;
    const maxStack = heldItem.stack_size;
    if (heldItem.count >= maxStack) return;

    let needed = maxStack - heldItem.count;
    const slotIndex = getSlotIndex(slotRefs.current, mousePos.x, mousePos.y);
    if (needed <= 0) return;
    if (!slotIndex) return;
    
    const order = getShiftClickOrder(slots, slotIndex, false, null, true);

    const next = slots.map(cloneSlot);
    let takenTotal = 0;

    for (let index of order) {
      const s = next[index];
      if (s.type === SlotType.OUTPUT) continue;
      if (!s.item) continue;
      if (s.item.id !== targetId) continue;
      if (needed <= 0) break;

      const take = Math.min(s.item.count, needed);
      if (take <= 0) continue;

      const remainInSlot = s.item.count - take;
      if (remainInSlot > 0) next[index] = { ...next[index], item: { ...s.item, count: remainInSlot } };
      else next[index] = { ...next[index], item: null };

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
      const key = e.key.toLowerCase();

      const hotbarIdx = hotkeyBindings[key];
      if (hotbarIdx != null) {
        const idx = getSlotIndex(slotRefs.current, mousePos.x, mousePos.y);
        if (idx) e.preventDefault();
        runHotkey(hotbarIdx, idx);
        return;
      }

      if (key === dropKey && !heldItem) {
        runDrop(e);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mousePos, slots, heldItem, hotkeyBindings]);

  useEffect(() => {
    if (craftingSlots == 0)
      return;

    const inputSlots = slots.slice(inputStart, inputEnd);
    const { output: outputItem } = getCraftingResult(inputSlots);

    setSlots((prev) => {
      const next = prev.slice();
      const outputIdx = inputEnd;
      next[outputIdx] = { ...next[outputIdx], item: outputItem };
      return next;
    });
  }, [slots
    .slice(inputStart, inputEnd)
    .map((s) => `${s.item?.id ?? "null"}:${s.item?.count ?? 0}`)
    .join(",")]);

  const { previewSlots, previewHeldItem } = useMemo(() => {
    if (!heldItem || (!dragLeft && !dragRight) || selectedSlots.length === 0) {
      return { previewSlots: undefined, previewHeldItem: undefined };
    }

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
      const { next: after, remaining } = distributeOneByOne(copy, valid, heldItem);
      const previewHeld = remaining > 0 ? { ...heldItem, count: remaining } : null;
      return { previewSlots: after, previewHeldItem: previewHeld };
    }
  }, [heldItem, dragLeft, dragRight, selectedSlots, slots]);


  function applyAfterInPlace(target: Slot[], after: Slot[]) {
    const len = Math.min(target.length, after.length);
    for (let k = 0; k < len; k++) {
      if (target[k] !== after[k]) target[k] = after[k];
    }
    for (let k = len; k < after.length; k++) {
      target[k] = after[k];
    }
  }

  function handleOutputClick(outputIdx: number, deleteResult: boolean = false) {
    const outputSlot = slots[outputIdx];
    if (!outputSlot?.item) return;

    const inputSlots = slots.slice(inputStart, inputEnd);
    const result = getCraftingResult(inputSlots);
    const { output, secondary } = result;
    if (!output) return;

    if (!deleteResult) {
      if (!heldItem) {
        setHeldItem({ ...output });
      } else if (heldItem.id !== output.id || heldItem.count + output.count > heldItem.stack_size) {
        return;
      } else {
        setHeldItem({ ...heldItem, count: heldItem.count + output.count });
      }
    }

    playSwapSound();
    if (onCraft)
      onCraft(output);

    const next = slots.slice();

    for (let i = inputStart; i < inputEnd; i++) {
      const s = next[i];
      if (!s?.item) continue;
      const newCount = s.item.count - 1;
      next[i] = { ...s, item: newCount > 0 ? { ...s.item, count: newCount } : null };
    }

    if (secondary && Array.isArray(secondary)) {
      for (let rel = 0; rel < secondary.length; rel++) {
        const sec = secondary[rel];
        if (!sec) continue;

        const targetIndex = inputStart + rel;
        const targetSlot = next[targetIndex];

        if (!targetSlot?.item) {
          next[targetIndex] = { ...targetSlot, item: { ...sec } };
        } else {
          const order = getShiftClickOrder(next, outputIdx, false);
          const { after: after } = tryPlaceAllTwoPass(next, order, order, false, sec, sec.count);

          if (after) {
            applyAfterInPlace(next, after);
          }
        }
      }
    }

    const newResult = getCraftingResult(next.slice(inputStart, inputEnd));
    const newOutput = newResult.output ?? null;
    next[outputIdx] = { ...next[outputIdx], item: newOutput };

    setSlots(next);
  }

  async function handleShiftClickOutput(outputIdx: number, deleteResult: boolean = false) {
    const outputSlot = slots[outputIdx];
    if (!outputSlot?.item) return;

    let didMove = false;
    let next = slots.map(cloneSlot)

    while (true) {
      const curOutput = next[outputIdx];
      if (!curOutput?.item) break;
      const item = curOutput.item;

      if (!deleteResult) {
        const firstOrder = getShiftClickOrder(next, outputIdx, false);
        const secondOrder = getShiftClickOrder(next, outputIdx, true);
        const { success, after, placed } = tryPlaceAllTwoPass(next, firstOrder, secondOrder, false, item, item.count);

        if (!success) break;
        if (placed > 0) didMove = true;
        next = after.map(cloneSlot);
      }

      if (onCraft)
        onCraft(item);
      const curRecipeResult = getCraftingResult(next.slice(inputStart, inputEnd));
      const secondary = curRecipeResult?.secondary;

      for (let i = inputStart; i < inputEnd; i++) {
        const s = next[i];
        if (!s?.item) continue;
        const newCount = s.item.count - 1;
        next[i] = { ...s, item: newCount > 0 ? { ...s.item, count: newCount } : null };
      }

      if (secondary) {
        for (let rel = 0; rel < secondary.length; rel++) {
          const sec = secondary[rel];
          if (!sec) continue;
          const targetIndex = inputStart + rel;
          const targetSlot = next[targetIndex];
          if (!targetSlot?.item) {
            next[targetIndex] = { ...targetSlot, item: { ...sec } };
          } else {
            const order = getShiftClickOrder(next, outputIdx, false);
            const { success: s2, after: afterSec } = tryPlaceAllTwoPass(next, order, order, false, sec, sec.count);
            if (s2 && afterSec) {
              next = afterSec.map(cloneSlot)
            } else {
              break;
            }
          }
        }
      }

      const newResult = getCraftingResult(next.slice(inputStart, inputEnd));
      const newOutput = newResult?.output ?? null;

      next[outputIdx] = { ...next[outputIdx], item: newOutput };

      if (!newOutput || newOutput.id !== item.id) break;
    }

    if (didMove) {
      playSwapSound();
    }
    setSlots(next);
  }


  function shiftClickSlots(clickedIdx: number, item: Item | null): Slot[] | null {
    if (!item) return null;
    const itemId = item.id;
    let next = slots.map(cloneSlot);

    const indices = slots
      .map((s, i) => (s?.item?.id === itemId ? i : -1))
      .filter((i) => i >= 0);

    for (const idx of indices) {
      const cur = next[idx];
      if (!cur?.item || cur.item.id !== itemId) {
        continue;
      }

      const after = shiftClickSlot(next, idx, slots[clickedIdx]?.type ?? null);
      if (!after) continue;
      next = after.map(cloneSlot);
    }

    return next;
  }

  function shiftClickSlot(slotsArr: Slot[], idx: number, overrideType: SlotType | null = null): Slot[] | null {
    const slot = slotsArr[idx];
    if (!slot?.item) return null;

    const item = slot.item;

    if (overrideType) {
      const type = slot.type;
      const avoidType = SHIFT_ROUTES[overrideType][0];
      if (type == avoidType)
        return null;
    }

    const next = slotsArr.map(cloneSlot);

    const totalToDistribute = item.count;
    next[idx] = { ...slot, item: null };

    const order = getShiftClickOrder(next, idx, false, overrideType);
    const { after, remaining } = tryPlaceAllTwoPass(next, order, order, true, item, totalToDistribute);

    if (remaining > 0) {
      after[idx] = { ...slot, item: { ...(slot.item as Item), count: remaining } };
    }

    return after;
  }

  function runDrop(e: KeyboardEvent) {
    const idx = getSlotIndex(slotRefs.current, mousePos.x, mousePos.y);
    if (idx == null) return;
    e.preventDefault();

    const slot = slots[idx];
    if (!slot?.item) return;
    if ((slot.type) == SlotType.OFFHAND) return;

    const next = [...slots];
    const item = slot.item;

    if (item) {
      if (slot.type == SlotType.OUTPUT) {
        if (e.ctrlKey) {
          handleShiftClickOutput(idx, true);
          playPutDownSound(item.sound);
          return;
        }
        else {
          handleOutputClick(idx, true);
          playPutDownSound(item.sound);
          return;
        }
      } else {
        next[idx] = {...slot,item: e.ctrlKey? null: item.count === 1? null: { ...item, count: item.count - 1 }};
        playPutDownSound(item.sound);
      }
    }

    setSlots(next);
  }

  function runHotkey(targetIndex: number, idx: number | null) {
    if (heldItem) return;
    if (targetIndex >= slots.length) return;
    if (idx == null) return;

    const sel = idx;
    const hot = targetIndex;
    const sSel = slots[sel];
    const sHot = slots[hot];

    if (sSel.type == SlotType.OFFHAND)
      return;

    // special output handling
    if (sSel.type == SlotType.OUTPUT) {
      if (sSel.item && !sHot.item) {
        setSlots((prev) => {
          const next = prev.slice();
          next[hot] = { ...next[hot], item: sSel.item };
          next[sel] = { ...next[sel], item: null };
          return next;
        });

        if (onCraft)
          onCraft(sSel.item);

        const curRecipeResult = getCraftingResult(slots.slice(inputStart, inputEnd));
        const secondary = curRecipeResult?.secondary;

        setSlots((prev) => {
          let next = prev.slice();
          for (let i = inputStart; i < inputEnd; i++) {
            const s = next[i];
            if (!s.item) continue;
            const count = s.item.count - 1;
            next[i] = { ...s, item: count > 0 ? { ...s.item, count } : null };
          }

          if (secondary) {
            for (let rel = 0; rel < secondary.length; rel++) {
              const sec = secondary[rel];
              if (!sec) continue;
              const targetIndex = inputStart + rel;
              const targetSlot = next[targetIndex];
              if (!targetSlot?.item) {
                next[targetIndex] = { ...targetSlot, item: { ...sec } };
              } else {
                const order = getShiftClickOrder(next, idx, false);
                const { success: s2, after: afterSec } = tryPlaceAllTwoPass(next, order, order, false, sec, sec.count);
                if (s2 && afterSec) {
                  next = afterSec.map(cloneSlot)
                } else {
                  break;
                }
              }
            }
          }

          const { output: newOutput } = getCraftingResult(next.slice(inputStart, inputEnd));
          next[sel] = { ...next[sel], item: newOutput };
          return next;
        });
        playSwapSound();
      }
      return;
    }

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
        next[hot] = { ...next[hot], item: sSel.item };
        next[sel] = { ...next[sel], item: sHot.item };
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
    setFirstLeft(false);
    setFirstRight(false);

    if (idx !== null && slots[idx]?.type == SlotType.OFFHAND) return;

    if (idx !== null && slots[idx]?.type == SlotType.OUTPUT) {
      if (e.shiftKey) {
        handleShiftClickOutput(idx);
      } else {
        handleOutputClick(idx);
      }
      return;
    }

    let isDoubleClicking = false;
    const now = performance.now();

    if (lastLeftDownRef.current && now - lastLeftDownRef.current <= DOUBLE_CLICK_MS)
      isDoubleClicking = true;

    setDoubleClick(false);
    if (e.button === 0 && idx !== null) {
      if (isDoubleClicking) {
        if (idx != doubleClickSlot) {
          setDoubleClickSlot(idx);
        }
        else {
          if (slots[idx].item || doubleClickItem != null) {
            setDoubleClick(true);
          }
        }
      }
      else {
        setDoubleClickItem(slots[idx].item);
        setDoubleClickSlot(idx);
        lastLeftDownRef.current = now;
      }
    }

    if (idx && slots[idx].item && e.shiftKey) {
      const after = shiftClickSlot(slots, idx);
      if (after) {
        playSwapSound();
        setSlots(after.map(cloneSlot));
      }
      return;
    }

    if (e.shiftKey)
      return;

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
            setFirstLeft(true);
            setHeldItem(s.item);
            playPickupSound(s.item.sound);
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
            setFirstRight(true);
            setHeldItem({ ...s.item, count: take });
            playPickupSound(s.item.sound);
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
    const idx = getSlotIndex(slotRefs.current, e.clientX, e.clientY);

    // cancel confusing cross-button drags
    if (e.button === 2 && dragLeft && heldItem) {
      setDragLeft(false);
      return;
    }
    if (e.button === 0 && dragRight && heldItem) {
      setDragRight(false);
      return;
    }

    if (doubleClick && idx) {
      if (e.shiftKey && heldItem) {
        const after = shiftClickSlots(idx, doubleClickItem)
        if (after)
          setSlots(after.map(cloneSlot));
      }
      else {
        runDoubleClick()
      }

      lastLeftDownRef.current = -999;
      setDragLeft(false);
      setDragRight(false);
      return;
    }
    setDoubleClick(false);

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
          playSwapSound();
          setHeldItem({ ...slotItem });
        } else {
          playPutDownSound(heldItem.sound);
          setHeldItem(null);
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
        playPutDownSound(heldItem.sound);
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
        playPutDownSound(heldItem.sound);
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
    if (slots[idx]?.type === SlotType.OFFHAND || slots[idx]?.type === SlotType.OUTPUT) return;

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
          playDragSound(heldItem.sound);
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
    firstLeft: firstLeft,
    firstRight: firstRight,
    dragStartIndex,
    hoverIndex,
    selectedSlots,
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
    setFirstLeft,
    setFirstRight,
    resetDrag,
  };

  return { state, handlers };
}
