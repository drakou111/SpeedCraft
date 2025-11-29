import { useSearchParams } from "react-router-dom";
import { decodeGameFromUrlPayload } from "../utils/UrlUtils";
import Inventory from "../components/Inventory";
import { SlotType, type Slot } from "../types/Slot";
import { useState, useEffect, useRef } from "react";
import { getItemById } from "../utils/ItemUtils";
import type { Game } from "../types/Game";
import { getAllItemsAsArray } from "../utils/InventoryUtils";
import type { Item } from "../types/Item";
import Confetti from "react-confetti";

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
  const [completed, setCompleted] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [confettiActive, setConfettiActive] = useState(false);
  const [finishedMs, setFinishedMs] = useState<number | null>(null);

  const startTimeRef = useRef<number | null>(null);
  const [timerStarted, setTimerStarted] = useState(false);

  const handleSlotsChange: React.Dispatch<React.SetStateAction<Slot[]>> = (value) => {
    const newSlots = typeof value === "function" ? (value as (prev: Slot[]) => Slot[])(_setSlots instanceof Function ?
      slots : slots) : value;

    if (!timerStarted && !completed && !areSlotsEqual(slots, newSlots)) {
      startTimeRef.current = Date.now();
      setTimerStarted(true);
    }

    _setSlots(newSlots);
  };

  useEffect(() => {
    const allItems = getAllItemsAsArray(slots);

    setGoalProgress(prev => {
      const newProgress = game!.goals.map((goal, i) => {
        let current = 0;
        for (const item of allItems) if (goal.items.includes(item.id)) current += item.count;

        if (!game!.checkAtEndOnly) return Math.max(prev[i], current);
        else return goal.max !== undefined && goal.max !== -1 ? Math.min(current, goal.max) : current;
      });

      const changed = newProgress.some((v, i) => v !== prev[i]);
      return changed ? newProgress : prev;
    });
  }, [slots, game]);

  useEffect(() => {
    if (completed) return;

    const allDone = goalProgress.every((v, i) => v >= (game!.goals[i].min ?? 1));
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
    const text = `I just completed "${game!.title ?? "Untitled"}" by ${game!.author ?? "Unknown"} in ${formatTime(elapsed)}, check it out here: ${window.location.href}`;
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
              const fulfilled = current >= (goal.min ?? 1);
              const progressText = (goal.max === -1 || goal.max === undefined || !game.checkAtEndOnly)
                ? `${current} / ${goal.min ?? 0}`
                : `${goal.min ?? 0} ≤ ${current} ≤ ${goal.max}`;

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
                  <button onClick={handleShare} style={{ padding: "8px 16px" }}>Share</button>
                  <button onClick={() => { setModalOpen(false); setConfettiActive(false); }} style={{ padding: "8px 16px" }}>Close</button>
                  <button onClick={handleRestart} style={{ padding: "8px 16px" }}>Restart</button>
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
        justifyContent: "center",
        background: "rgba(30, 30, 30, 0.85)",
        padding: 8,
        borderRadius: 16,
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)"
      }}>
        <button onClick={handleRestart} style={{ padding: "8px 16px", fontSize: 16 }}>Restart</button>
        <button onClick={() => window.location.href = "/"} style={{ padding: "8px 16px", fontSize: 16 }}>Go Home</button>
        <button onClick={() => window.location.href = `/edit?data=${data}`} style={{ padding: "8px 16px", fontSize: 16 }}>Edit</button>
      </div>
    </div>
  );
}
