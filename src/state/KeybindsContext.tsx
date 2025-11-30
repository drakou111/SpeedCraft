"use client";

import { createContext, useContext, useState, useMemo, useCallback } from "react";

export type Keybinds = Record<string, string>;

export const defaultKeybinds: Keybinds = {
  hotbar1: "1",
  hotbar2: "2",
  hotbar3: "3",
  hotbar4: "4",
  hotbar5: "5",
  hotbar6: "6",
  hotbar7: "7",
  hotbar8: "8",
  hotbar9: "9",
  offhand: "f",
  drop: "q",
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
