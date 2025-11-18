// src/components/Inventory.tsx
import React, { useMemo, useState } from "react";
import { useInventoryInput } from "../hooks/UseInventoryInputs";
import type { Item } from "../types/Item";
import type { Slot } from "../types/Slot";
import {
    distributeEvenlyToSlots,
    distributeOneByOne,
} from "../utils/InventoryUtils";

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
    const { containerRef, slotRefs, onMouseDown, onMouseMove, onMouseUp, onContextMenu } = handlers;

    const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: -9999, y: -9999 });

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
                <img src={item.icon} alt={item.name} className="item-icon" draggable={false} />
                {item.count > 1 && (
                    <>
                        <div className={`item-count-shadow ${preview ? "preview-count" : ""}`}>{item.count}</div>
                        <div className={`item-count ${preview ? "preview-count" : ""}`}>{item.count}</div>
                    </>
                )}
            </>
        );
    }

    const inventoryStart = 0;
    const hotbarStart = inventorySlots;
    const craftStart = inventorySlots + hotbarSlots;
    const craftEnd = craftStart + craftingSlots - 1;
    const outputIndex = craftEnd + 1;
    const offhandIndex = outputIndex + 1;

    // previewActive (only when dragging and multiple targets and heldItem.count > 1)
    const previewActive = Boolean(
        state.heldItem &&
        (state.draggingLeft || state.draggingRight) &&
        state.selectedSlots.length > 1
    );

    // Compute visual preview while dragging (purely visual, no state mutations)
    const { previewSlotsMap, previewHeldCount } = useMemo(() => {
        if (!previewActive || !state.heldItem) {
            return { previewSlotsMap: new Map<number, Item | null>(), previewHeldCount: state.heldItem ? state.heldItem.count : 0 };
        }

        // shallow copy slots and items
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

    // TODO: dont drag highlight if empty
    function slotClassName(i: number) {
        if (state.selectedSlots.length <= 1) return `slot`;

        const s = slots[i];
        const held = state.heldItem;

        const selected = state.selectedSlots.includes(i);
        const hover = state.dragCurrentIndex === i;

        let dragged = false;
        if (selected && held) {
            const empty = !s.item;
            const sameType = s.item && s.item.id === held.id;
            if ((empty || sameType)) dragged = true;
        }

        return `slot ${dragged ? "dragged" : ""} ${hover ? "hover" : ""}`.trim();
    }

    function renderSlotByIndex(slot: Slot, i: number) {
        const previewItem = previewSlotsMap.has(i) ? previewSlotsMap.get(i) ?? null : null;
        const actualItem = slot?.item ?? null;
        const showPreview = previewActive && previewSlotsMap.has(i);

        return (
            <div
                key={i}
                ref={(el) => { slotRefs.current[i] = el; }}
                className={slotClassName(i)}
                data-index={i}
            >
                {showPreview ? renderItem(previewItem, true) : renderItem(actualItem, false)}
            </div>
        );
    }

    // helper to render a block of slots by absolute slice
    function renderRange(start: number, length: number) {
        return slots.slice(start, start + length).map((slot, idx) => renderSlotByIndex(slot, start + idx));
    }

    // small helper for crafting grid columns (sqrt fallback)
    const craftCols = Number.isInteger(Math.sqrt(craftingSlots)) ? Math.sqrt(craftingSlots) : Math.ceil(Math.sqrt(craftingSlots));

    return (
        <>


            {/* Crafting area: inputs (left) + output (right) */}
            <div
                style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 12,
                }}
            >
                {/* Offhand (placed last) */}
                <div
                    ref={(el) => { slotRefs.current[offhandIndex] = el; }}
                    className={`offhand-slot ${slotClassName(offhandIndex)}`}
                    data-index={offhandIndex}
                    onMouseDown={onMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onContextMenu={onContextMenu}
                    style={{
                        marginTop: 12,
                        marginRight: 150,
                        width: 64,
                        height: 64,
                    }}
                >
                    {previewActive && previewSlotsMap.has(offhandIndex)
                        ? renderItem(previewSlotsMap.get(offhandIndex) ?? null, true)
                        : renderItem(slots[offhandIndex]?.item ?? null)}
                </div>

                {/* Crafting input grid (left) */}
                <div
                    onMouseDown={onMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onContextMenu={onContextMenu}
                    style={{
                        display: "grid",
                        gridTemplateColumns: `repeat(${craftCols}, 64px)`,
                    }}
                >
                    {renderRange(craftStart, craftingSlots)}
                </div>

                {/* Crafting output (right) */}
                <div
                    ref={(el) => { slotRefs.current[outputIndex] = el; }}
                    className={slotClassName(outputIndex)}
                    data-index={outputIndex}
                    onMouseDown={onMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onContextMenu={onContextMenu}
                    style={{
                        width: 64,
                        height: 64,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    {previewActive && previewSlotsMap.has(outputIndex)
                        ? renderItem(previewSlotsMap.get(outputIndex) ?? null, true)
                        : renderItem(slots[outputIndex]?.item ?? null)}
                </div>
            </div>



            {/* Inventory (grid) */}
            <div
                ref={containerRef as any}
                onMouseDown={onMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onContextMenu={onContextMenu}
                style={{
                    display: "grid",
                    gridTemplateColumns: `repeat(${hotbarSlots}, 64px)`,
                    userSelect: "none",
                }}
            >
                {renderRange(inventoryStart, inventorySlots)}
            </div>

            {/* Hotbar */}
            <div
                onMouseDown={onMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onContextMenu={onContextMenu}
                style={{
                    display: "grid",
                    gridTemplateColumns: `repeat(${hotbarSlots}, 64px)`,
                    marginTop: 16,
                }}
            >
                {renderRange(hotbarStart, hotbarSlots)}
            </div>


            {/* Held item preview */}
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
        </>
    );
}
