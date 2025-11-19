import { useState } from "react"
import Inventory from "./components/Inventory"
import { SlotType } from "./types/Slot"
import type { Slot } from "./types/Slot"
import "./App.css"
import type { Item } from "./types/Item"

function slot(type: Slot["type"]): Slot {
  return { item: null, type };
}

export default function App() {
  const startingItems: Array<Item> = [
    { id: "cod", name: "Cod", icon: "./items/cod.png", count: 64, stack_size: 64 },
    { id: "cod", name: "Cod", icon: "./items/cod.png", count: 1, stack_size: 64 },
    { id: "heart_of_the_sea", name: "Heart of the sea", icon: "./items/heart_of_the_sea.png", count: 12, stack_size: 64 },
    { id: "apple", name: "Apple", icon: "./items/apple.png", count: 5, stack_size: 64 },
  ]


  const columns = 9;
  const rows = 3;
  const inventorySlots = rows * columns;
  const hotbarSlots = columns;
  const craftingSlots = 9;

  const initialSlots: Slot[] = [
    ...Array.from({ length: inventorySlots }, () => ({ item: null, type: SlotType.INVENTORY })), // inventory
    ...Array.from({ length: hotbarSlots }, () => ({ item: null, type: SlotType.HOTBAR })), // hotbar
    ...Array.from({ length: craftingSlots }, () => ({ item: null, type: SlotType.INPUT })), // input
    { item: null, type: SlotType.OUTPUT }, // output
    { item: null, type: SlotType.OFFHAND }, // offhand
  ]

  startingItems.slice(0, initialSlots.length).forEach((item, idx) => {
    initialSlots[idx].item = item;
  })

  const [slots, setSlots] = useState<Array<Slot>>(initialSlots);

  return (
    <div className="app">
      <h1>SpeedCraft</h1>

      <Inventory slots={slots} setSlots={setSlots} inventorySlots={inventorySlots} hotbarSlots={hotbarSlots} craftingSlots={craftingSlots} />
    </div>
  )
}
