import React from "react";
import type { Item } from "../types/Item";
import { playPickupSound, playPutDownSound } from "../utils/SoundUtils";
import { getItemById } from "../utils/ItemUtils";

export type ItemSourceProps = {
  itemId: string;
  heldItem: Item | null;
  setHeld: (it: Item | null) => void;
};

export default function ItemSource({
  itemId,
  heldItem,
  setHeld
}: ItemSourceProps) {
  const proto = getItemById(itemId);

  if (!proto) {
    return (
      <div>
        {`Item: ${itemId} (missing)`}
      </div>
    );
  }

  function handleMouseDown(e: React.MouseEvent) {
    if (!proto) {
        return;
    }

    e.preventDefault();
    e.stopPropagation();

    if (e.button === 0) {
      if (!heldItem) {
        setHeld({ ...proto, count: proto.stack_size });
        playPickupSound();
      } else {
        setHeld(null);
        playPutDownSound();
      }
    } else if (e.button === 2) {
      if (!heldItem) {
        setHeld({ ...proto, count: 1 });
        playPickupSound();
      } else {
        if (heldItem.count > 1) {
          setHeld({ ...heldItem, count: heldItem.count - 1 });
          playPutDownSound();
        } else {
          setHeld(null);
          playPutDownSound();
        }
      }
    }
  }

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
  }

 return (
  <div
    role="button"
    tabIndex={0}
    onMouseDown={handleMouseDown}
    onContextMenu={handleContextMenu}
    style={{
      userSelect: "none",
      cursor: "pointer",
      width: 64,
      height: 64,
      display: "grid",
      placeItems: "center",
      borderRadius: 4,
      transition: "background 80ms",
      background: "rgba(255, 255, 255, 0.05)",
    }}
    onMouseEnter={(e) => {
      (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.12)";
    }}
    onMouseLeave={(e) => {
      (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
    }}
    aria-label={`Item source ${proto.id}`}
  >
    <img
      src={(proto as any).icon ?? ""}
      alt=""
      style={{
        width: 48,
        height: 48,
        objectFit: "contain",
        imageRendering: "pixelated",
        pointerEvents: "none",
      }}
    />
  </div>
);

}
