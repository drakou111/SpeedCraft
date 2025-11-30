import { getItemById } from "../utils/ItemUtils";
import ItemPickerDropdown from "./ItemPickerDropdown";
import type { GoalItem } from "../types/Game";
import InfoIcon from "./InfoIcon";

export default function GoalItemEditor({
    goal,
    onChange,
    onRemove
}: {
    goal: GoalItem;
    onChange: (g: GoalItem) => void;
    onRemove: () => void;
}) {
    const containerStyle: React.CSSProperties = {
        background: "rgba(255,255,255,0.05)",
        padding: 10,
        borderRadius: 6,
        border: "1px solid rgba(255,255,255,0.12)"
    };

    const rowStyle: React.CSSProperties = {
        display: "flex",
        alignItems: "center",
        gap: 10
    };

    const itemsGridStyle: React.CSSProperties = {
        display: "flex",
        flexWrap: "wrap",
        gap: 6
    };

    const itemStyle: React.CSSProperties = {
        width: 48,
        height: 48,
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.15)",
        borderRadius: 4,
        display: "grid",
        placeItems: "center",
        cursor: "pointer"
    };

    const numberInputStyle: React.CSSProperties = {
        width: 32
    };

    function addAllowedItem(id: string) {
        if (!goal.items.includes(id)) {
            onChange({ ...goal, items: [...goal.items, id] });
        }
    }

    function removeAllowedItem(id: string) {
        onChange({ ...goal, items: goal.items.filter((x) => x !== id) });
    }

    return (
        <div style={containerStyle}>
            <div style={rowStyle}>
                <div style={itemsGridStyle}>
                    {goal.items.map((id) => {
                        const it = getItemById(id);
                        if (!it) return null;

                        return (
                            <div
                                key={id}
                                onClick={() => removeAllowedItem(id)}
                                title="Click to remove"
                                style={itemStyle}
                            >
                                <img
                                    src={it.icon}
                                    alt=""
                                    style={{
                                        width: 40,
                                        height: 40,
                                        imageRendering: "pixelated",
                                        pointerEvents: "none"
                                    }}
                                />
                            </div>
                        );
                    })}
                </div>

                <ItemPickerDropdown selectedIds={goal.items} onSelect={addAllowedItem} />

                <button onClick={onRemove} style={{ marginLeft: "auto" }}>
                    Remove
                </button>
            </div>

            <div style={{ marginTop: 10, display: "flex", gap: 12 }}>
                <div>
                    <label style={{ fontSize: 12 }}>Min: </label>
                    <input
                        type="number"
                        value={goal.min ?? ""}
                        min={-1}
                        max={64}
                        onChange={(e) => {
                            let val = Number(e.target.value);
                            if (isNaN(val)) val = -1;
                            val = Math.max(-1, Math.min(64, val));
                            onChange({ ...goal, min: val });
                        }}
                        style={numberInputStyle}
                    />
                </div>

                <div>
                    <label style={{ fontSize: 12 }}>Max: </label>
                    <input
                        type="number"
                        value={goal.max ?? ""}
                        min={-1}
                        max={64}
                        onChange={(e) => {
                            let val = Number(e.target.value);
                            if (isNaN(val)) val = -1;
                            val = Math.max(-1, Math.min(64, val));
                            onChange({ ...goal, max: val });
                        }}
                        style={numberInputStyle}
                    />
                </div>

                <InfoIcon content="The player must have at least 'Min' and at most 'Max' of the items defined above. Putting min or max to -1 basically removes that cap." size={20} textSize={15} width={500} color="white" />

            </div>
        </div>
    );
}
