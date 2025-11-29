import LZString from "lz-string";
import type { Game } from "../types/Game";

export function encodeGameToUrlPayload(def: Game): string {
  const json = JSON.stringify(def);

  return LZString.compressToEncodedURIComponent(json);
}

export function decodeGameFromUrlPayload(payload: string): Game | null {
  try {
    const json = LZString.decompressFromEncodedURIComponent(payload);
    if (!json) return null;
    return JSON.parse(json) as Game;
  } catch (e) {
    console.error("decode error", e);
    return null;
  }
}
