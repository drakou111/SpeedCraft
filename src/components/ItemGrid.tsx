import { useState, useMemo } from "react";
import ItemSource from "./ItemSource";
import type { Item } from "../types/Item";
import { getAllItems } from "../utils/ItemUtils";

export type ItemGridProps = {
  itemIds?: string[];
  heldItem: Item | null;
  setHeld: (it: Item | null) => void;
  columns?: number;
};

export default function ItemGrid({
  itemIds,
  heldItem,
  setHeld,
  columns = 10,
}: ItemGridProps) {
  const allIds = itemIds ?? getAllItems().map((it) => it.id);

  const [search, setSearch] = useState("");

  const filteredIds = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allIds;
    return allIds.filter((id) => id.toLowerCase().includes(q));
  }, [search, allIds]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        background: "rgba(0,0,0,0.25)",
        borderRadius: 6,
        width: "100%",
      }}
    >
      <div style={{ padding: 8 }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..."
          style={{
            width: "97.5%",
            padding: "6px 8px",
            borderRadius: 4,
            border: "1px solid rgba(255,255,255,0.2)",
            background: "rgba(0,0,0,0.3)",
            color: "white",
            outline: "none",
          }}
        />
      </div>

      <div
        style={{
          height: 250,
          overflowY: "auto",
          paddingRight: 4,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${columns}, 64px)`,
            gap: 5,
            padding: 8,
          }}
        >
          {filteredIds.map((id) => (
            <ItemSource
              key={id}
              itemId={id}
              heldItem={heldItem}
              setHeld={setHeld}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
