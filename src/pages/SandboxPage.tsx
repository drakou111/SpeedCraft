import Inventory from "../components/Inventory";
import { SlotType, type Slot } from "../types/Slot";
import { useState } from "react";
import { getAllItems } from "../utils/ItemUtils";

export default function SandboxPage() {
  const columns = 9;
  const rows = 3;
  const inventorySlots = rows * columns;
  const hotbarSlots = columns;
  const craftingSlots = 9;

  // Initialize slots
  const initialSlots: Slot[] = [
    ...Array.from({ length: inventorySlots }, () => ({ item: null, type: SlotType.INVENTORY })),
    ...Array.from({ length: hotbarSlots }, () => ({ item: null, type: SlotType.HOTBAR })),
    { item: null, type: SlotType.OFFHAND },
    ...Array.from({ length: craftingSlots }, () => ({ item: null, type: SlotType.INPUT })),
    { item: null, type: SlotType.OUTPUT },
  ];

  const [slots, setSlots] = useState<Slot[]>(initialSlots);
  const infiniteItems = getAllItems();

  return (
    <div className="app" style={{ display: "flex", gap: 12, margin: 24 }}>
      <Inventory
        slots={slots}
        infiniteItems={infiniteItems}
        setSlots={setSlots}
        inventorySlots={inventorySlots}
        hotbarSlots={hotbarSlots}
        craftingSlots={craftingSlots}
      />
    </div>
  );
}
