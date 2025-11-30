"use client";

import React, { useState, useRef, useEffect } from "react";
import { Info } from "lucide-react";

interface InfoIconProps {
  content: React.ReactNode;
  size?: number;
  textSize?: number;
  width?: number;
  color?: string;
}

export default function InfoIcon({
  content,
  size = 24,
  textSize = 24,
  width = 300,
  color = "currentColor",
}: InfoIconProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div style={{ position: "relative", display: "inline-block" }} ref={ref}>
      <span
        onClick={() => setOpen((o) => !o)}
        style={{
          border: "none",
          background: "none",
          padding: 0,
          cursor: "pointer",
        }}
      >
        <Info size={size} color={color} style={{ transform: "translateY(4px)" }} />
      </span>

      <div
        style={{
          position: "absolute",
          top: "120%",
          left: "50%",
          transform: `translateX(-50%) ${open ? "translateY(0)" : "translateY(-5px)"}`,
          background: "#333",
          color: "white",
          padding: "8px 12px",
          borderRadius: 6,
          boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
          zIndex: 1000,
          minWidth: width,
          wordWrap: "break-word",
          textAlign: "center",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.2s ease, transform 0.2s ease",
          fontSize: textSize
        }}
      >
        {content}
      </div>
    </div>
  );
}
