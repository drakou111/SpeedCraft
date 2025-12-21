import React, { createContext, useContext, useState } from "react";
import GlobalTooltip from "./GlobalTooltip";

type TooltipState = {
  content: React.ReactNode | null;
};

type TooltipContextType = {
  showTooltip: (content: React.ReactNode) => void;
  hideTooltip: () => void;
};

const TooltipContext = createContext<TooltipContextType | null>(null);

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  const [tooltip, setTooltip] = useState<TooltipState>({ content: null });

  const showTooltip = (content: React.ReactNode) => {
    setTooltip({ content });
  };

  const hideTooltip = () => {
    setTooltip({ content: null });
  };

  return (
    <TooltipContext.Provider value={{ showTooltip, hideTooltip }}>
      {children}
      <GlobalTooltip content={tooltip.content} />
    </TooltipContext.Provider>
  );
}

export function useTooltip() {
  const ctx = useContext(TooltipContext);
  if (!ctx) throw new Error("useTooltip must be used inside TooltipProvider");
  return ctx;
}
