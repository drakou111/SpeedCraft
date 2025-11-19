import React, { useEffect, useMemo, useState } from "react";
import { useInventoryInput } from "../hooks/UseInventoryInputs";
import type { Item } from "../types/Item";
import { SlotType, type Slot } from "../types/Slot";
import {
    distributeEvenlyToSlots,
    distributeOneByOne,
} from "../utils/InventoryUtils";
import { slotPositions } from "../data/SlotPositions";

export default function Inventory({
    slots,
    setSlots,
    inventorySlots,
    hotbarSlots,
    craftingSlots,
}: {
    slots: Array<Slot>;
    setSlots: React.Dispatch<React.SetStateAction<Array<Slot>>>;
    inventorySlots: number;
    hotbarSlots: number;
    craftingSlots: number;
}) {
    const { state, handlers } = useInventoryInput({
        slots,
        setSlots,
        inventorySlots,
        hotbarSlots,
        craftingSlots,
    });
    const { slotRefs, onMouseDown, onMouseMove, onMouseUp, onContextMenu } = handlers;

    const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: -9999, y: -9999 });
    const [mouseInInventory, setMouseInInventory] = useState(false);

    useEffect(() => {
        if (!state.heldItem) return;

        function handleGlobalMouseMove(e: MouseEvent) {
            setMousePos({ x: e.clientX, y: e.clientY });
        }

        window.addEventListener("mousemove", handleGlobalMouseMove);

        return () => {
            window.removeEventListener("mousemove", handleGlobalMouseMove);
        };
    }, [state.heldItem]);


    function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
        onMouseMove(e);
        setMousePos({ x: e.clientX, y: e.clientY });
    }

    function handleMouseUp(e: React.MouseEvent<HTMLDivElement>) {
        onMouseUp(e);
        if (!state.heldItem) setMousePos({ x: -9999, y: -9999 });
    }

    function renderItem(item: Item | null, preview = false) {
        if (!item) return null;
        return (
            <>
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
                const res = distributeEvenlyToSlots(cp, validIndices, held); // expects { next, placed }
                const after = res.next;
                for (const i of validIndices) previewMap.set(i, after[i].item ? { ...after[i].item } : null);
                previewHeld = held.count - (res.placed ?? 0);
            } else {
                const cp = copy.map((r) => ({ ...r, item: r.item ? { ...r.item } : null }));
                const res = distributeOneByOne(cp, validIndices, held); // expects { next, remaining }
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

        const selected = state.selectedSlots.includes(i); // <-- only when inside
        const hover =  mouseInInventory && state.hoverIndex === i;

        let dragged = false;
        if (selected && held) {
            const empty = !s.item;
            const sameType = s.item && s.item.id === held.id;
            const isOutput = s.type == SlotType.OUTPUT;
            if ((empty || sameType) && !isOutput) dragged = true;
        }

        const offhand = s.type == SlotType.OFFHAND;

        return `slot ${dragged ? "dragged" : ""} ${hover ? "hover" : ""} ${offhand ? "offhand" : "" }`.trim();
    }

    return (
        <>
            <div className="inventory-wrapper">
                <div className="inventory-root"
                onContextMenu={(e) => e.preventDefault()}>
                    <img src="/layouts/crafting_table.png" className="inventory-img" />
                    {slots.map((slot, i) => {
                        const pos = slotPositions[i];
                        if (!pos) return null;

                        return (
                            <div
                                key={i}
                                ref={(el) => { slotRefs.current[i] = el; }}
                                data-index={i}
                                className={slotClassName(i)}
                                onMouseDown={onMouseDown}
                                onMouseMove={handleMouseMove}
                                onMouseUp={handleMouseUp}
                                onContextMenu={onContextMenu}
                                onMouseEnter={() => setMouseInInventory(true)}
                                onMouseLeave={() => setMouseInInventory(false)}
                                style={{
                                    position: "absolute",
                                    left: pos.x,
                                    top: pos.y,
                                    width: 64,
                                    height: 64,
                                }}
                            >
                                {previewActive && previewSlotsMap.has(i)
                                    ? renderItem(previewSlotsMap.get(i) ?? null, true)
                                    : renderItem(slot?.item ?? null)}
                            </div>
                        );
                    })}


                    {state.heldItem && (
                        <div
                            className="held-item"
                            style={{
                                left: mousePos.x,
                                top: mousePos.y,
                                transform: "translate(-50%, -50%)",
                            }}
                        >
                            {renderItem(
                                { ...state.heldItem, count: previewActive ? previewHeldCount : state.heldItem.count }
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
