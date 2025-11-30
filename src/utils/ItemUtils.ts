import type { Item } from "../types/Item";
import rawItems from "../data/items/all_items.json" assert { type: "json" };


function ensureMinecraftPrefix(id: string) {
    return id.startsWith("minecraft:") ? id : `minecraft:${id}`;
}

function deriveNameFromId(id: string) {
    // "minecraft:yellow_bed" -> "Yellow Bed"
    const base = ensureMinecraftPrefix(id).split(":")[1] ?? id;
    return base
        .split(/[_-]/)
        .map((w) => w[0]?.toUpperCase() + w.slice(1))
        .join(" ");
}

type RawItem = {
    id: string;
    name?: string;
    icon?: string;
    count?: number;
    stack_size?: number;
    sound?: string;
};

const _raw: RawItem[] = (rawItems as any) || [];

const items: Item[] = _raw.map((r) => {
    const id = ensureMinecraftPrefix(r.id);
    return {
        id,
        name: r.name ?? deriveNameFromId(id),
        icon: "./items/" + (r.icon ?? `${id.split(":")[1]}.png`),
        count: r.count ?? 0,
        stack_size: r.stack_size ?? 64,
        sound: r.sound ?? "DEFAULT"
    } as Item;
});
const itemsById = new Map<string, Item>();
for (const it of items) itemsById.set(it.id, it);

export function getAllItems(): Item[] {
    return items;
}

export function getItemById(id: string): Item | undefined {
    if (!id) return undefined;
    return itemsById.get(ensureMinecraftPrefix(id));
}