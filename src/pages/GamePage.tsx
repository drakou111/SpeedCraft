import { useNavigate, useSearchParams } from "react-router-dom";
import { decodeGameFromUrlPayload } from "../utils/UrlUtils";
import Inventory from "../components/Inventory";
import { SlotType, type Slot } from "../types/Slot";
import { useState, useEffect, useRef } from "react";
import { getItemById } from "../utils/ItemUtils";
import type { Game } from "../types/Game";
import { getAllItemsAsArray } from "../utils/InventoryUtils";
import type { Item } from "../types/Item";
import Confetti from "react-confetti";
import { Repeat, House, Pencil, ExternalLink } from "lucide-react";

function Timer({ startTimeRef, completed, finishedMs }: {
  startTimeRef: React.MutableRefObject<number | null>;
  completed: boolean;
  finishedMs: number | null;
}) {
  const [, forceTick] = useState(0);

  useEffect(() => {
    let id: number | null = null;
    const tick = () => {
      forceTick(t => t + 1);
      id = window.setTimeout(tick, 50);
    };

    if (finishedMs == null && !completed) id = window.setTimeout(tick, 50);

    return () => { if (id != null) clearTimeout(id); };
  }, [completed, finishedMs]);

  const elapsed = finishedMs !== null ? finishedMs : (startTimeRef.current ? Date.now() - startTimeRef.current : 0);

  const mins = Math.floor(elapsed / 60000);
  const secs = Math.floor((elapsed % 60000) / 1000);
  const millis = elapsed % 1000;

  return <span>{`${mins}:${secs.toString().padStart(2, "0")}.${millis.toString().padStart(3, "0")}`}</span>;
}

function areSlotsEqual(a: Slot[], b: Slot[]) {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const sa = a[i];
    const sb = b[i];
    if (sa.type !== sb.type) return false;
    const ia = sa.item;
    const ib = sb.item;
    if (ia === ib) continue;
    if (!ia && !ib) continue;
    if (!ia || !ib) return false;
    if (ia.id !== ib.id) return false;
    if (ia.count !== ib.count) return false;
  }
  return true;
}

export default function GamePage() {
  const navigate = useNavigate();

  const columns = 9;
  const rows = 3;
  const inventorySlots = rows * columns;
  const hotbarSlots = columns;
  const craftingSlots = 9;

  const [params] = useSearchParams();
  const data = params.get("data");
  const game: Game | null = data ? decodeGameFromUrlPayload(data) : null;
  if (!game) return <div><h1>No Game</h1></div>;

  const initialSlots: Slot[] = [
    ...Array.from({ length: inventorySlots }, () => ({ item: null, type: SlotType.INVENTORY })),
    ...Array.from({ length: hotbarSlots }, () => ({ item: null, type: SlotType.HOTBAR })),
    { item: null, type: SlotType.OFFHAND },
    ...Array.from({ length: craftingSlots }, () => ({ item: null, type: SlotType.INPUT })),
    { item: null, type: SlotType.OUTPUT },
  ];

  for (let idx = 0; idx < game.startLayout.length; idx++) {
    const itemInfo = game.startLayout[idx];
    if (itemInfo) {
      const item = getItemById(itemInfo.id);
      if (item) initialSlots[idx].item = { ...item, count: itemInfo.count };
    }
  }

  const [slots, _setSlots] = useState<Slot[]>(initialSlots);
  const infiniteItems = (game.infiniteSupply ?? []).map(id => getItemById(id)).filter(Boolean) as Item[];

  const [goalProgress, setGoalProgress] = useState<number[]>(game.goals.map(() => 0));
  const [goalPassed, setGoalPassed] = useState<boolean[]>(game.goals.map(() => false));
  const [completed, setCompleted] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [confettiActive, setConfettiActive] = useState(false);
  const [finishedMs, setFinishedMs] = useState<number | null>(null);

  const startTimeRef = useRef<number | null>(null);
  const [timerStarted, setTimerStarted] = useState(false);

  function handleCrafted(crafted: Item) {
    if (!game) return;
    if (game.checkAtEndOnly) return;

    setGoalProgress(prev => {
      return prev.map((val, i) => {
        const goal = game.goals[i];
        if (!goal.items.includes(crafted.id)) return val;
        return val + crafted.count;
      });
    });
  }

  function formatGoalProgress(current: number, min?: number, max?: number) {
    const m = min ?? -1;
    const M = max ?? -1;

    // Case N/A
    if ((m === -1 || m === 0) && (M === -1)) return "N/A";

    // Case: only max
    if ((m === -1 || m === 0) && M > -1) return `(${current}) ≤ ${M}`;

    // Case: only min
    if (m > 0 && (M === -1 || M === 0)) return `(${current}) / ${m}`;

    // Case: both min and max
    if (m > 0 && M > 0) return `${m} ≤ (${current}) ≤ ${M}`;

    return `(${current})`; // fallback
  }

  const handleSlotsChange: React.Dispatch<React.SetStateAction<Slot[]>> = (value) => {
    _setSlots(prev => {
      const newSlots = typeof value === "function" ? value(prev) : value;

      if (!timerStarted && !completed && !areSlotsEqual(prev, newSlots)) {
        startTimeRef.current = Date.now();
        setTimerStarted(true);
      }

      return newSlots;
    });
  };

  useEffect(() => {
    const allItems = getAllItemsAsArray(slots);

    setGoalProgress(prev => {
      const newProgress = game!.goals.map((goal) => {
        let current = 0;
        for (const item of allItems)
          if (goal.items.includes(item.id)) current += item.count;
        return current;
      });

      const changed = newProgress.some((v, i) => v !== prev[i]);
      return changed ? newProgress : prev;
    });
  }, [slots, game]);

  useEffect(() => {
     if (completed) return;

  const updated = [...goalPassed];
  let changed = false;

  for (let i = 0; i < game.goals.length; i++) {
    if (updated[i]) continue; // already passed, keep it

    const goal = game.goals[i];
    const current = goalProgress[i];

    const min = goal.min ?? -1;
    const max = goal.max ?? -1;

    const minCheck = min === -1 ? true : current >= min;
    const maxCheck = max === -1 ? true : current <= max;

    if (minCheck && maxCheck) {
      updated[i] = true;
      changed = true;
    }
  }

  if (changed) {
    setGoalPassed(updated); // <-- only updates when truly needed
  }
    const allDone = goalProgress.every((v, i) => {
      const goal = game!.goals[i];

      if (!game.checkAtEndOnly && goalPassed[i]) return true;

      const min = goal.min ?? -1;
      const max = goal.max ?? -1;

      const minCheck = min === -1 ? true : v >= min;
      const maxCheck = max === -1 ? true : v <= max;

      return minCheck && maxCheck;
    });

    if (allDone) {
      setCompleted(true);
      setModalOpen(true);
      setConfettiActive(true);

      const elapsed = startTimeRef.current ? Date.now() - startTimeRef.current : 0;
      setFinishedMs(elapsed);
    }
  }, [goalProgress, completed, game]);

  const formatTime = (ms: number) => {
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    const millis = ms % 1000;
    return `${mins}:${secs.toString().padStart(2, "0")}.${millis.toString().padStart(3, "0")}`;
  };

  const handleShare = () => {
    const elapsed = finishedMs ?? (startTimeRef.current ? Date.now() - startTimeRef.current : 0);
    const text = `I just completed "${game!.title ?? "Untitled"}" by ${game!.author ?? "Unknown"} in ${formatTime(elapsed)}, check it out [here](${window.location.href}).`;
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  };

  const handleRestart = () => window.location.reload();

  return (
    <div className="app" style={{ display: "flex", gap: 0, margin: 24 }}>
      <div style={{
        textAlign: "center",
        marginBottom: 24,
        color: "#f0f0f0",
        lineHeight: 1.4
      }}>
        {game.title && <h1 style={{ fontSize: 32, marginBottom: 8 }}>{game.title}</h1>}
        {game.description && <p style={{ fontSize: 16, marginBottom: 12, color: "#ccc" }}>{game.description}</p>}
        {game.author && <h2 style={{ fontSize: 20, fontWeight: 400, color: "#aaa" }}>By {game.author}</h2>}
      </div>

      <Inventory
        slots={slots}
        setSlots={handleSlotsChange}
        infiniteItems={infiniteItems}
        inventorySlots={inventorySlots}
        hotbarSlots={hotbarSlots}
        craftingSlots={craftingSlots}
        onCraft={handleCrafted}
      />

      <div style={{
        marginTop: 24,
        flex: "1",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        background: "rgba(30, 30, 30, 0.85)",
        padding: 24,
        borderRadius: 16,
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
      }}>
        <div style={{ fontSize: 24, fontWeight: 600, marginBottom: 16 }}>
          Time: <Timer startTimeRef={startTimeRef} completed={completed} finishedMs={finishedMs} />
        </div>

        <div style={{ fontSize: 20, fontWeight: 500, marginBottom: 16 }}>
          {goalProgress.filter((v, i) => v >= (game!.goals[i].min ?? 1)).length} / {game.goals.length} goals done
        </div>

        {game.showOnUI && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(10, 1fr)",
            gap: 12,
            marginTop: 12
          }}>
            {game.goals.map((goal, i) => {
              const current = goalProgress[i];
              const min = goal.min ?? -1;
              const max = goal.max ?? -1;
              const minCheck = min === -1 ? true : current >= min;
              const maxCheck = max === -1 ? true : current <= max;
              const fulfilled = (!game.checkAtEndOnly && goalPassed[i]) || (minCheck && maxCheck);
              const progressText = formatGoalProgress(current, min, max);

              return (
                <div key={i} style={{
                  display: "flex",
                  flexDirection: "column",
                  padding: 10,
                  borderRadius: 8,
                  background: fulfilled ? "rgba(0, 200, 0, 0.15)" : "rgba(200, 0, 0, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
                  transition: "background 0.3s",
                }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6, justifyContent: "center" }}>
                    {goal.items.map(id => {
                      const it = getItemById(id);
                      if (!it) return null;
                      return (
                        <div key={id} style={{
                          width: 32,
                          height: 32,
                          display: "grid",
                          placeItems: "center",
                          borderRadius: 6,
                          background: "rgba(255,255,255,0.08)",
                          border: "1px solid rgba(255,255,255,0.15)"
                        }}>
                          <img src={it.icon} alt="" style={{ width: 28, height: 28, imageRendering: "pixelated", pointerEvents: "none" }} />
                        </div>
                      );
                    })}
                  </div>
                  <div style={{
                    fontSize: 13,
                    textAlign: "center",
                    fontWeight: 500,
                    background: fulfilled ? "rgba(0,200,0,0.1)" : "rgba(200,0,0,0.1)",
                    padding: "2px 6px",
                    borderRadius: 4
                  }}>
                    {progressText}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {modalOpen && (
          <>
            {confettiActive && <Confetti width={window.innerWidth} height={window.innerHeight} recycle={false} numberOfPieces={300} />}
            <div style={{
              position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
              background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 10000
            }}>
              <div style={{ background: "#222", padding: 20, borderRadius: 8, width: 420, color: "white", position: "relative" }}>
                <button
                  aria-label="Close"
                  onClick={() => { setModalOpen(false); setConfettiActive(false); }}
                  style={{ position: "absolute", top: 10, right: 10, fontSize: 18, background: "transparent", border: "none", color: "white", cursor: "pointer" }}
                >✖</button>

                <h3 style={{ marginTop: 4 }}>Congratulations!</h3>
                <p style={{ marginTop: 8 }}>
                  You completed "{game.title ?? "Untitled"}" in {finishedMs !== null ? formatTime(finishedMs) : <Timer startTimeRef={startTimeRef} completed={false} finishedMs={null} />}!
                </p>

                <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 12 }}>
                  <button onClick={handleShare} style={{ padding: "8px 16px" }}>
                    Share
                    <ExternalLink size={16} style={{ transform: "translateX(4px) translateY(4px)" }} />
                  </button>
                  <button onClick={handleRestart} style={{ padding: "8px 16px" }}>
                    Restart
                    <Repeat size={16} style={{ transform: "translateX(4px) translateY(4px)" }} />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <div style={{
        marginTop: 24,
        gap: 16,
        display: "flex",
        background: "rgba(30, 30, 30, 0.85)",
        padding: 8,
        borderRadius: 16,
        fontSize: 32
      }}>
        <button onClick={handleRestart} style={{
          padding: "12px 24px",
          fontWeight: 600,
          cursor: "pointer",
          fontSize: 32
        }}>
          Restart

          <Repeat size={32} style={{ transform: "translateX(4px) translateY(4px)" }} />
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
        <button onClick={() => navigate(`/edit?data=${data}`)} style={{
          padding: "12px 24px",
          fontWeight: 600,
          cursor: "pointer",
          fontSize: 32
        }}>
          Edit

          <Pencil size={32} style={{ transform: "translateX(4px) translateY(4px)" }} />
        </button>
      </div>
    </div>
  );
}
