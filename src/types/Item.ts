export interface Item {
  id: string
  name: string
  icon: string
  count: number
  stack_size: number
  sound?: SoundCategory
}

export type SoundCategory =
  | "WOOD"
  | "METAL"
  | "WOOL"
  | "GRASS"
  | "SAND"
  | "STONE"
  | "GRAVEL"
  | "DEFAULT"  
