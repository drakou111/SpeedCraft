import Inventory from "../components/Inventory";
import { SlotType, type Slot } from "../types/Slot";
import { useState } from "react";
import { getAllItems } from "../utils/ItemUtils";
import { useNavigate } from "react-router-dom";
import { Eraser, House } from "lucide-react";

export default function SandboxPage() {
  const columns = 9;
  const rows = 3;
  const inventorySlots = rows * columns;
  const hotbarSlots = columns;
  const craftingSlots = 9;

  const initialSlots: Slot[] = [
    ...Array.from({ length: inventorySlots }, () => ({ item: null, type: SlotType.INVENTORY })),
    ...Array.from({ length: hotbarSlots }, () => ({ item: null, type: SlotType.HOTBAR })),
    { item: null, type: SlotType.OFFHAND },
    ...Array.from({ length: craftingSlots }, () => ({ item: null, type: SlotType.INPUT })),
    { item: null, type: SlotType.OUTPUT },
  ];

  const [slots, setSlots] = useState<Slot[]>(initialSlots);
  const infiniteItems = getAllItems();

  const handleRestart = () => window.location.reload();

  const navigate = useNavigate();

  return (
    <div className="app" style={{ display: "flex", gap: 12, margin: 24 }}>
      <Inventory
        slots={slots}
        infiniteItems={infiniteItems}
        setSlots={setSlots}
        inventorySlots={inventorySlots}
        hotbarSlots={hotbarSlots}
        craftingSlots={craftingSlots}
        resetSignal={0}
      />
      <div style={{
        marginTop: 24,
        gap: 16,
        display: "flex",
        background: "rgba(30, 30, 30, 0.85)",
        padding: 8,
        borderRadius: 16,
        fontSize: 32
      }}>
        <button onClick={handleRestart} style={{
          padding: "12px 24px",
          fontWeight: 600,
          cursor: "pointer",
          fontSize: 32
        }}>Clear
          <Eraser size={32} style={{ transform: "translateX(4px) translateY(4px)" }} /></button>
        <button onClick={() => navigate("/")} style={{
          padding: "12px 24px",
          fontWeight: 600,
          cursor: "pointer",
          fontSize: 32
        }}>Go Home

          <House size={32} style={{ transform: "translateX(4px) translateY(4px)" }} />
        </button>
      </div>
    </div>

  );
}
