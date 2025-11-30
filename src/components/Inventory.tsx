import React, { useEffect, useMemo, useRef, useState } from "react";
import { useInventoryInput } from "../hooks/UseInventoryInputs";
import type { Item } from "../types/Item";
import { SlotType, type Slot } from "../types/Slot";
import "../App.css"
import {
    distributeEvenlyToSlots,
    distributeOneByOne,
} from "../utils/InventoryUtils";
import { slotPositions } from "../data/SlotPositions";
import ItemGrid from "./ItemGrid";
import { playPutDownSound } from "../utils/SoundUtils";

export default function Inventory({
    slots,
    setSlots,
    infiniteItems,
    inventorySlots,
    hotbarSlots,
    craftingSlots,
    onCraft,
}: {
    slots: Array<Slot>;
    setSlots: React.Dispatch<React.SetStateAction<Array<Slot>>>;
    infiniteItems: Item[],
    inventorySlots: number;
    hotbarSlots: number;
    craftingSlots: number;
    onCraft?: (crafted: Item) => void;
}) {
    const { state, handlers } = useInventoryInput({
        slots,
        setSlots,
        inventorySlots,
        hotbarSlots,
        craftingSlots,
        onCraft
    });
    const { slotRefs, onMouseDown, onMouseMove, onMouseUp, onContextMenu } = handlers;

    const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: -9999, y: -9999 });
    const [mouseInInventory, setMouseInInventory] = useState(false);

    const inventoryRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleGlobalMouseMove(e: MouseEvent) {
            setMousePos({ x: e.clientX, y: e.clientY });
        }

        window.addEventListener("mousemove", handleGlobalMouseMove);

        return () => {
            window.removeEventListener("mousemove", handleGlobalMouseMove);
        };
    }, [state.heldItem]);

    useEffect(() => {
        function handleGlobalMouseUp(e: MouseEvent) {
            if (!state.heldItem) return;

            const root = inventoryRef.current;
            if (!root) return;

            e.preventDefault();

            const clickedInside = root.contains(e.target as Node);

            if (!clickedInside && e.button === 0) {
                if (state.heldItem != null && !state.firstLeft) {
                    handlers.setHeld(null);
                    playPutDownSound();
                }
            }
            if (!clickedInside && e.button === 2) {
                if (state.heldItem != null && !state.firstRight) {
                    const held = state.heldItem;
                    handlers.setHeld(held.count > 1 ? {...held, count: held.count - 1} : null);
                    playPutDownSound();
                }
            }
            handlers.setFirstRight(false);
            handlers.setFirstLeft(false);
        }

        window.addEventListener("mouseup", handleGlobalMouseUp);
        return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
    }, [state]);

    useEffect(() => {
        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
        };

    window.addEventListener("contextmenu", handleContextMenu);
    return () => window.removeEventListener("contextmenu", handleContextMenu);
    }, [state]);


    function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
        onMouseMove(e);
        setMousePos({ x: e.clientX, y: e.clientY });
    }

    function handleMouseUp(e: React.MouseEvent<HTMLDivElement>) {
        onMouseUp(e);
        setMousePos({ x: e.clientX, y: e.clientY });
    }

    function handleMouseDown(e: React.MouseEvent<HTMLDivElement>) {
        onMouseDown(e);
        setMousePos({ x: e.clientX, y: e.clientY });
    }

    function renderItem(item: Item | null, preview = false) {
        if (!item) {
            return (
                <>
                    <div className="slot-bg" aria-hidden="true" />
                </>
            );
        }

        return (
            <>
                <div className="slot-bg" aria-hidden="true" />

                {item.count > 0 && (
                    <img src={item.icon} alt={item.name} className="item-icon" draggable={false} />
                )}
                {item.count > 1 && (
                    <>
                        <div className={`item-count-shadow ${preview ? "preview-count" : ""}`}>{item.count}</div>
                        <div className={`item-count ${preview ? "preview-count" : ""}`}>{item.count}</div>
                    </>
                )}
            </>
        );
    }

    const previewActive = Boolean(
        state.heldItem &&
        (state.draggingLeft || state.draggingRight) &&
        state.selectedSlots.length > 1
    );

    const { previewSlotsMap, previewHeldCount } = useMemo(() => {
        if (!previewActive || !state.heldItem) {
            return { previewSlotsMap: new Map<number, Item | null>(), previewHeldCount: state.heldItem ? state.heldItem.count : 0 };
        }

        const copy: Slot[] = slots.map((s) => (s && s.item ? { ...s, item: { ...s.item } } : { ...s, item: null }));

        const held = { ...state.heldItem };
        const validIndices = state.selectedSlots.filter((idx) => {
            if (idx < 0 || idx >= copy.length) return false;
            const s = copy[idx];
            return !s.item || s.item.id === held.id;
        });

        const previewMap = new Map<number, Item | null>();
        let previewHeld = held.count;

        if (validIndices.length === 0) {
            return { previewSlotsMap: previewMap, previewHeldCount: previewHeld };
        }

        if (state.draggingLeft) {
            const perSlot = Math.floor(held.count / validIndices.length);
            if (perSlot > 0) {
                const cp = copy.map((r) => ({ ...r, item: r.item ? { ...r.item } : null }));
                const res = distributeEvenlyToSlots(cp, validIndices, held);
                const after = res.next;
                for (const i of validIndices) previewMap.set(i, after[i].item ? { ...after[i].item } : null);
                previewHeld = held.count - (res.placed ?? 0);
            } else {
                const cp = copy.map((r) => ({ ...r, item: r.item ? { ...r.item } : null }));
                const res = distributeOneByOne(cp, validIndices, held);
                const after = res.next;
                for (const i of validIndices) previewMap.set(i, after[i].item ? { ...after[i].item } : null);
                previewHeld = res.remaining ?? held.count;
            }
        } else if (state.draggingRight) {
            const cp = copy.map((r) => ({ ...r, item: r.item ? { ...r.item } : null }));
            const res = distributeOneByOne(cp, validIndices, held);
            const after = res.next;
            for (const i of validIndices) previewMap.set(i, after[i].item ? { ...after[i].item } : null);
            previewHeld = res.remaining ?? held.count;
        }

        return { previewSlotsMap: previewMap, previewHeldCount: previewHeld };
    }, [
        previewActive,
        state.selectedSlots.join(","),
        state.draggingLeft,
        state.draggingRight,
        state.heldItem?.count,
        slots,
    ]);

    function slotClassName(i: number) {
        const s = slots[i];
        const held = state.heldItem;

        const selected = state.selectedSlots.includes(i);
        const hover = mouseInInventory && state.hoverIndex === i;

        let overflow = false;
        let dragged = false;
        if (selected && held && state.selectedSlots.length > 1) {
            const empty = !s.item;
            const sameType = s.item && s.item.id === held.id;
            const isOutput = s.type == SlotType.OUTPUT;
            if ((empty || sameType) && !isOutput) dragged = true;


            if (dragged) {
                if (state.draggingLeft) {
                    const spreadPer = Math.floor((held.count ?? 0) / state.selectedSlots.length)
                    if (s.item && s.item.count + spreadPer > s.item.stack_size) {
                        overflow = true;
                    }
                }
                else if (state.draggingRight) {
                    const index = state.selectedSlots.indexOf(i);
                    if (s.item && s.item.count >= s.item.stack_size && index <= held.count) {
                        overflow = true;
                    }
                }
            }
        }

        const offhand = s.type == SlotType.OFFHAND;
        return `slot ${dragged ? "dragged" : ""} ${hover ? "hover" : ""} ${overflow ? "overflow" : ""} ${offhand ? "offhand" : ""}`.trim();
    }

    return (
        <>
            <div className="inventory-wrapper">
                <div
                    ref={inventoryRef}
                    className="inventory-root"
                    onMouseDown={(e) => handleMouseDown(e)}
                    onMouseMove={(e) => handleMouseMove(e)}
                    onMouseUp={(e) => handleMouseUp(e)}
                    onContextMenu={(e) => onContextMenu(e)}
                    onMouseLeave={() => { setMouseInInventory(false); }}
                    onMouseEnter={() => { setMouseInInventory(true); }}
                >
                    <img src="./layouts/crafting_table.png" className="inventory-img" />
                    {slots.map((slot, i) => {
                        const pos = slotPositions[i];
                        if (!pos) return null;

                        return (
                            <div
                                key={i}
                                ref={(el) => { slotRefs.current[i] = el; }}
                                data-index={i}
                                className={slotClassName(i)}
                                style={{
                                    left: pos.x,
                                    top: pos.y,
                                }}
                            >
                                {previewActive && previewSlotsMap.has(i)
                                    ? renderItem(previewSlotsMap.get(i) ?? null, true)
                                    : renderItem(slot?.item ?? null)}
                            </div>
                        );
                    })}


                </div>

                <div
                    className="held-item"
                    style={{
                        left: mousePos.x,
                        top: mousePos.y,
                        transform: "translate(-50%, -50%)",
                    }}
                >
                    {state.heldItem &&
                        renderItem({
                            ...state.heldItem,
                            count: previewActive
                                ? previewHeldCount
                                : state.heldItem.count,
                        })
                    }
                </div>
            </div>

            {infiniteItems.length > 0 &&
                <div className="item-grid-container" style={{
                    marginTop: 10
                }}>
                    <ItemGrid
                        itemIds={infiniteItems.map(a => a.id)}
                        heldItem={state.heldItem}
                        setHeld={handlers.setHeld}
                        setFirstLeft={handlers.setFirstLeft}
                        setFirstRight={handlers.setFirstRight}
                    />
                </div>
            }
        </>
    );
}
