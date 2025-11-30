"use client";

import { createContext, useContext, useState, useMemo, useCallback } from "react";

export type Keybinds = Record<string, string>;

export const defaultKeybinds: Keybinds = {
  hotbar1: "digit1",
  hotbar2: "digit2",
  hotbar3: "digit3",
  hotbar4: "digit4",
  hotbar5: "digit5",
  hotbar6: "digit6",
  hotbar7: "digit7",
  hotbar8: "digit8",
  hotbar9: "digit9",
  offhand: "keyf",
  drop: "keyq",
};

interface KeybindContextType {
  keybinds: Keybinds;
  setKeybind: (action: string, key: string) => void;
  setKeybinds: React.Dispatch<React.SetStateAction<Keybinds>>;
}

const KeybindContext = createContext<KeybindContextType | undefined>(undefined);

export function KeybindProvider({ children }: { children: React.ReactNode }) {
  const [keybinds, setKeybinds] = useState<Keybinds>(() => {
    const saved = localStorage.getItem("keybinds");
    return saved ? JSON.parse(saved) : defaultKeybinds;
  });

  const setKeybind = useCallback(
    (action: string, key: string) => {
      setKeybinds((prev) => {
        const next = { ...prev, [action]: key };
        localStorage.setItem("keybinds", JSON.stringify(next));
        return next;
      });
    },
    []
  );

  const ctxValue = useMemo(() => ({ keybinds, setKeybind, setKeybinds }), [
    keybinds,
    setKeybind,
    setKeybinds,
  ]);

  return <KeybindContext.Provider value={ctxValue}>{children}</KeybindContext.Provider>;
}

export const useKeybinds = () => {
  const ctx = useContext(KeybindContext);
  if (!ctx) throw new Error("useKeybinds must be used inside a KeybindProvider");
  return ctx;
};
