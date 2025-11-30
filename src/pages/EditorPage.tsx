import { useSearchParams, useNavigate } from "react-router-dom";
import { decodeGameFromUrlPayload, encodeGameToUrlPayload } from "../utils/UrlUtils";
import Inventory from "../components/Inventory";
import { SlotType, type Slot } from "../types/Slot";
import { useEffect, useState } from "react";
import { getAllItems, getItemById } from "../utils/ItemUtils";
import type { Game, ItemInfo, GoalItem } from "../types/Game";
import { GoalsEditor } from "../components/GoalsEditor";
import { getAllItemsAsArray } from "../utils/InventoryUtils";
import { Gamepad2, House } from "lucide-react";
import InfoIcon from "../components/InfoIcon";

export default function EditorPage() {
    const navigate = useNavigate();
    const columns = 9;
    const rows = 3;
    const inventorySlots = rows * columns;
    const hotbarSlots = columns;

    const [params] = useSearchParams();
    const data = params.get("data");
    let loadedGame: Game | null = data ? decodeGameFromUrlPayload(data) : null;

    const [title, setTitle] = useState(loadedGame?.title || "");
    const [author, setAuthor] = useState(loadedGame?.author || "");
    const [description, setDescription] = useState(loadedGame?.description || "");
    const [checkAtEndOnly, setCheckAtEndOnly] = useState(loadedGame?.checkAtEndOnly ?? true);
    const [showOnUI, setShowOnUI] = useState(loadedGame?.showOnUI ?? true);
    const [goals, setGoals] = useState<GoalItem[]>(loadedGame?.goals || []);

    let initialSlots: Slot[] = [
        ...Array.from({ length: inventorySlots }, () => ({ item: null, type: SlotType.INVENTORY })),
        ...Array.from({ length: hotbarSlots }, () => ({ item: null, type: SlotType.HOTBAR })),
        { item: null, type: SlotType.OFFHAND }
    ];

    if (loadedGame) {
        for (let i = 0; i < loadedGame.startLayout.length; i++) {
            const info = loadedGame.startLayout[i];
            if (!info) continue;
            const item = getItemById(info.id);
            if (item) initialSlots[i].item = { ...item, count: info.count };
        }
    }

    const [slots, setSlots] = useState<Slot[]>(initialSlots);

    function exportToGame(): Game {
        const layout: (ItemInfo | null)[] = Array(inventorySlots + hotbarSlots + 1).fill(null);
        for (let i = 0; i < slots.length; i++) {
            const item = slots[i].item;
            if (item) layout[i] = { id: item.id, count: item.count };
        }
        return {
            goals,
            startLayout: layout,
            title: title || undefined,
            author: author || undefined,
            description: description || undefined,
            showOnUI,
            checkAtEndOnly
        };
    }

    useEffect(() => {
        const game = exportToGame();
        const encoded = encodeGameToUrlPayload(game);
        navigate(`?data=${encoded}`, { replace: true });
    }, [title, author, description, showOnUI, checkAtEndOnly, goals, slots]);

    const handlePlay = () => {
        const encoded = encodeGameToUrlPayload(exportToGame());
        navigate(`/game?data=${encoded}`);
    };

    return (
        <div className="app" style={{ display: "flex", flexDirection: "column", gap: "24px", alignItems: "center", margin: 24 }}>
            <Inventory
                slots={slots}
                infiniteItems={getAllItems()}
                setSlots={setSlots}
                inventorySlots={inventorySlots}
                hotbarSlots={hotbarSlots}
                craftingSlots={0}

            />

            <div style={{
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                maxWidth: "600px",
                width: "100%",
                background: "rgba(40,40,40,0.85)",
                padding: "20px",
                borderRadius: "12px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                color: "#f0f0f0"
            }}>
                <div>
                    <label style={{ fontWeight: 600, display: "block", marginBottom: 4 }}>Title</label>
                    <input
                        placeholder="Epic Puzzle"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        style={{ width: "100%", padding: "8px", borderRadius: 6, border: "1px solid #555", background: "#333", color: "#f0f0f0" }}
                        maxLength={50}
                    />
                </div>

                <div>
                    <label style={{ fontWeight: 600, display: "block", marginBottom: 4 }}>Author</label>
                    <input
                        placeholder="George"
                        value={author}
                        onChange={e => setAuthor(e.target.value)}
                        style={{ width: "100%", padding: "8px", borderRadius: 6, border: "1px solid #555", background: "#333", color: "#f0f0f0" }}
                        maxLength={50}
                    />
                </div>

                <div>
                    <label style={{ fontWeight: 600, display: "block", marginBottom: 4 }}>Description</label>
                    <textarea
                        placeholder="Very cool puzzle"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        rows={3}
                        style={{ width: "100%", padding: "8px", borderRadius: 6, border: "1px solid #555", background: "#333", color: "#f0f0f0" }}
                        maxLength={200}
                    />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <label>
                            <input
                                type="checkbox"
                                checked={showOnUI}
                                onChange={(e) => setShowOnUI(e.target.checked)}
                            />
                            Show goals on UI
                        </label>
                        <InfoIcon content="Whether to show the goal items or not. Can be fun for puzzles where you have to remember the recipes." size={20} textSize={15} color="white" />
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <label>
                            <input
                                type="checkbox"
                                checked={checkAtEndOnly}
                                onChange={(e) => setCheckAtEndOnly(e.target.checked)}
                            />
                            Check goals only at the end
                        </label>
                        <InfoIcon content="When enabled, the player must end with all required items. If disabled, simply crafting it counts and can be thrown away." size={20} textSize={15} color="white" />
                    </div>
                </div>
            </div>

            <GoalsEditor goals={goals} setGoals={setGoals} inventoryItems={getAllItemsAsArray(slots)} />

                <div style={{
                    gap: 16,
                    display: "flex",
                    background: "rgba(30, 30, 30, 0.85)",
                    borderRadius: 16,
                    fontSize: 32,
                    padding: "12px 24px",
                }}>

                <button onClick={handlePlay} style={{
                    padding: "12px 24px",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontSize: 32
                }}>
                    Play
                    <Gamepad2 size={32} style={{ transform: "translateX(4px) translateY(4px)" }} />
                </button>
                <button onClick={() => navigate("/")} style={{
                    padding: "12px 24px",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontSize: 32
                }}>
                    Go Home
                    <House size={32} style={{ transform: "translateX(4px) translateY(4px)" }} />
                </button>
            </div>

        </div>
    );
}
