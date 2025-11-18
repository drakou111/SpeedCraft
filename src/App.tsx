import { useState } from "react"
import Inventory from "./components/Inventory"
import type { Slot } from "./types/Slot"
import "./App.css"
import type { Item } from "./types/Item"

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
  const craftingSlots = 4;

  const initialSlots: Slot[] = [
    ...Array.from({ length: inventorySlots }, () => ({ item: null })), // inventory
    ...Array.from({ length: hotbarSlots }, () => ({ item: null, isPrioritized: true })), // hotbar
    ...Array.from({ length: craftingSlots }, () => ({ item: null, input: true, preventShiftClickToIt: true, isPrioritized: true })), // input
    { item: null, output: true, isPrioritized: true }, // output
    { item: null, hidden: true, preventShiftClickToIt: true }, // offhand

  ]

  startingItems.slice(0, initialSlots.length).forEach((item, idx) => {
    initialSlots[idx].item = item;
  })

  const [slots, setSlots] = useState<Array<Slot>>(initialSlots);

  return (
    <div className="app">
      <h1>Minecraft Inventory</h1>

      <Inventory slots={slots} setSlots={setSlots} inventorySlots={inventorySlots} hotbarSlots={hotbarSlots} craftingSlots={craftingSlots} />
    </div>
  )
}
