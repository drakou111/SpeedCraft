import type { Item } from "./Item"

export type Slot = {
  item: Item | null
  isPrioritized?: boolean
  hidden?: boolean
  preventShiftClickToIt?: boolean
  output?: boolean
  input?: boolean
}