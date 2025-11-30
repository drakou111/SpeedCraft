import { useState } from "react";
import GoalItemEditor from "./GoalItemEditor";
import type { GoalItem } from "../types/Game";
import { allPossibleItemsFromInput } from "../utils/RecipeUtils";
import type { Item } from "../types/Item";
import InfoIcon from "./InfoIcon";

export function GoalsEditor({
    goals,
    setGoals,
    inventoryItems
}: {
    goals: GoalItem[];
    setGoals: (g: GoalItem[]) => void;
    inventoryItems: Item[]
}) {
    const [modal, setModal] = useState<{
        visible: boolean;
        title: string;
        description: string;
        onConfirm: () => void;
    } | null>(null);

    const containerStyle: React.CSSProperties = {
        padding: 12,
        borderRadius: 6,
        width: 700,
        textAlign: "center",
        background: "rgba(40,40,40,0.85)",
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
    };
    
    const gridStyle: React.CSSProperties = {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
        gap: 12,
        marginBottom: 12
    };

    function addGoal() {
        setGoals([...goals, { items: [], min: 1, max: -1 }]);
    }

    function updateGoal(i: number, updated: GoalItem) {
        const copy = [...goals];
        copy[i] = updated;
        setGoals(copy);
    }

    function removeGoal(i: number) {
        const copy = [...goals];
        copy.splice(i, 1);
        setGoals(copy);
    }

    function handleRemoveAll() {
        setModal({
            visible: true,
            title: "Remove All Goals",
            description: "Are you sure you want to remove all goals? This cannot be undone.",
            onConfirm: () => {
                setGoals([]);
                setModal(null);
            }
        });
    }

    function handleAllCombinations() {
        setModal({
            visible: true,
            title: "Generate All Combinations",
            description: `Are you sure? This will generate all possible goals based on the current inventory. This will generate ${allPossibleItemsFromInput(inventoryItems).length} goals and delete your current ones.`,
            onConfirm: () => {
                const allItems = allPossibleItemsFromInput(inventoryItems);
                const allCombos = allItems.map(i => ({
                    items: [i.id],
                    min: 1,
                    max: -1
                } as GoalItem));

                setGoals(allCombos);
                setModal(null);
            }
        });
    }

    return (
        <div style={containerStyle}>
            <h2>Goals <InfoIcon content="What the player must craft." size={20} color="white" /></h2>

            <div style={gridStyle}>
                {goals.map((g, i) => (
                    <GoalItemEditor
                        key={i}
                        goal={g}
                        onChange={(upd) => updateGoal(i, upd)}
                        onRemove={() => removeGoal(i)}
                    />
                ))}
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 12 }}>
                <button onClick={addGoal}>+ Add Goal</button>
                <button onClick={handleRemoveAll}>Remove All</button>
                <button onClick={handleAllCombinations}>All Combinations</button>
            </div>

            {modal?.visible && (
                <div style={{
                    position: "fixed",
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: "rgba(0,0,0,0.5)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 999
                }}>
                    <div style={{
                        background: "#333",
                        padding: 24,
                        borderRadius: 8,
                        width: 400,
                        textAlign: "center",
                        color: "#f0f0f0"
                    }}>
                        <h3>{modal.title}</h3>
                        <p>{modal.description}</p>
                        <div style={{ display: "flex", justifyContent: "space-around", marginTop: 16 }}>
                            <button onClick={() => setModal(null)}>Cancel</button>
                            <button onClick={modal.onConfirm} style={{ backgroundColor: "#f0a500", border: "none", padding: "8px 16px", borderRadius: 4 }}>Confirm</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
