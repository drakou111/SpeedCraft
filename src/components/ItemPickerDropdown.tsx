import { useState, useRef, useEffect } from "react";
import { getAllItems } from "../utils/ItemUtils";

export type ItemPickerDropdownProps = {
    onSelect: (id: string) => void;
    selectedIds?: string[];
};

export default function ItemPickerDropdown({
    onSelect,
    selectedIds = []
}: ItemPickerDropdownProps) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const ref = useRef<HTMLDivElement>(null);

    const all = getAllItems();
    const filtered = query
        ? all.filter((it) => it.id.toLowerCase().includes(query.toLowerCase()))
        : all;

    useEffect(() => {
        function handle(e: MouseEvent) {
            if (!ref.current) return;
            if (!ref.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener("mousedown", handle);
        return () => document.removeEventListener("mousedown", handle);
    }, []);

    return (
        <div style={{ position: "relative", display: "inline-block" }} ref={ref}>
            <button
                onClick={() => setOpen((v) => !v)}
                style={{
                    width: 32,
                    height: 32,
                    borderRadius: 4,
                    border: "1px solid rgba(255,255,255,0.2)",
                    background: "rgba(255,255,255,0.07)",
                    display: "inline-flex",
                    justifyContent: "center",
                    alignItems: "center",
                    padding: "4px 8px",
                    cursor: "pointer"
                }}
                title="Add allowed item"
            >
                +
            </button>

            {open && (
                <div
                    style={{
                        position: "absolute",
                        top: "110%",
                        left: 0,
                        zIndex: 999,
                        background: "#111",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 6,
                        padding: 6,
                        width: 350,
                    }}
                >
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search item..."
                        style={{
                            padding: "6px",
                            marginBottom: 6,
                            borderRadius: 4,
                            border: "1px solid rgba(255,255,255,0.2)",
                            background: "#222",
                            color: "white",
                        }}
                    />

                    <div
                        style={{
                            maxHeight: 260,
                            overflowY: "auto",
                            display: "grid",
                            gridTemplateColumns: "repeat(6, 40px)",
                            rowGap: 6,
                            columnGap: 16,
                            paddingRight: 3,
                        }}
                    >
                        {filtered.map((proto) => (
                            <div
                                key={proto.id}
                                onClick={() => {
                                    onSelect(proto.id);
                                    setOpen(false);
                                }}
                                style={{
                                    width: 48,
                                    height: 48,
                                    background: selectedIds.includes(proto.id)
                                        ? "rgba(0,200,0,0.35)"
                                        : "rgba(255,255,255,0.05)",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    borderRadius: 4,
                                    display: "grid",
                                    placeItems: "center",
                                    cursor: "pointer",
                                }}
                            >
                                <img
                                    src={proto.icon}
                                    alt=""
                                    style={{
                                        width: 40,
                                        height: 40,
                                        imageRendering: "pixelated",
                                        pointerEvents: "none",
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
