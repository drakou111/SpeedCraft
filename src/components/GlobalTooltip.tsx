import { useEffect, useState } from "react";

export default function GlobalTooltip({ content }: { content: React.ReactNode }) {
  const [pos, setPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      setPos({ x: e.clientX + 12, y: e.clientY + 12 });
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  if (!content) return null;

  return (
    <div
      className="tooltip"
      style={{
        "--tx": `${pos.x}px`,
        "--ty": `${pos.y - 80}px`,
      } as React.CSSProperties}
    >
      <div className="tooltip-content">
        {content}
      </div>
    </div>
  );
}
