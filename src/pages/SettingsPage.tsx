import React from "react";
import { useKeybinds } from "../state/KeybindsContext";
import { getVolume } from "../utils/SoundUtils";

const defaultKeybinds = {
    hotbar1: "digit1",
    hotbar2: "digit2",
    hotbar3: "digit3",
    hotbar4: "digit4",
    hotbar5: "digit5",
    hotbar6: "digit6",
    hotbar7: "digit7",
    hotbar8: "digit8",
    hotbar9: "digit9",
    offhand: "keyf",
    drop: "keyq",
};

let lastSoundTime = 0;

export const playPreviewSound = () => {
    const now = performance.now();
    if (now - lastSoundTime < 50) return;
    lastSoundTime = now;

    const a = new Audio("./sounds/click.mp3");
    a.volume = getVolume() * 0.2;
    a.play().catch(() => { });
};

export default function SettingsPage() {
    const { keybinds, setKeybind, setKeybinds } = useKeybinds();
    const actions = Object.keys(keybinds) as (keyof typeof keybinds)[];

    const [volume, setVolume] = React.useState(getVolume);

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = parseFloat(e.target.value);
        setVolume(v);
        localStorage.setItem("volume", String(v));
        playPreviewSound();
    };

    const handleReset = () => {
        localStorage.setItem("keybinds", JSON.stringify(defaultKeybinds));
        setKeybinds({ ...defaultKeybinds });
    };

    return (
        <div
            style={{
                minHeight: "100vh",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                color: "white",
            }}
        >
            <div
                style={{
                    width: "100%",
                    maxWidth: 420,
                    padding: 24,
                    borderRadius: 12,
                    background: "#2c2c2c",
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    textAlign: "center",
                }}
            >
                <h1 style={{ margin: 0 }}>Settings</h1>
                <hr
                    style={{
                        border: 0,
                        borderTop: "1px solid #555",
                        margin: "0",
                    }}
                />
                <section>
                    <h2 style={{ marginBottom: 8 }}>Sound</h2>

                    <label style={{ display: "block", marginBottom: 6 }}>
                        Volume: {(volume * 100).toFixed(0)}%
                    </label>

                    <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={volume}
                        onChange={handleVolumeChange}
                        style={{ width: "100%" }}
                    />
                </section>
                <hr
                    style={{
                        border: 0,
                        borderTop: "1px solid #555",
                        margin: "0",
                    }}
                />
                <section>
                    <h2 style={{ marginBottom: 12 }}>Keybinds</h2>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {actions.map((action) => (
                            <KeybindRow
                                key={action}
                                action={action}
                                value={keybinds[action]}
                                onChange={setKeybind}
                                allKeybinds={keybinds}
                            />
                        ))}
                    </div>
                </section>

                <button
                    onClick={handleReset}
                    style={{
                        marginTop: 10,
                        padding: "10px 16px",
                        borderRadius: 6,
                        color: "white",
                        background: "#444",
                        cursor: "pointer",
                        fontWeight: "bold",
                    }}
                >
                    Reset to Default
                </button>
            </div>
        </div>
    );
}

function KeybindRow({
    action,
    value,
    onChange,
    allKeybinds,
}: {
    action: string;
    value: string;
    onChange: (action: string, newKey: string) => void;
    allKeybinds: Record<string, string>;
}) {
    const [listening, setListening] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const timeoutRef = React.useRef<number | null>(null);

    const beginListening = () => {
        if (listening) return;
        setListening(true);
        setError(null);

        const handler = (e: KeyboardEvent) => {
            e.preventDefault();
            const key = e.code.toLowerCase();

            const duplicate = Object.entries(allKeybinds).find(
                ([otherAction, assignedKey]) =>
                    otherAction !== action && assignedKey.toLowerCase() === key
            );

            if (duplicate) {
                setError(`"${key.toUpperCase()}" is already bound to ${duplicate[0]}`);
                if (timeoutRef.current) clearTimeout(timeoutRef.current);
                timeoutRef.current = window.setTimeout(() => setError(null), 1000);
            } else {
                onChange(action, key);
                playPreviewSound();
            }

            setListening(false);
            window.removeEventListener("keydown", handler);
        };

        window.addEventListener("keydown", handler);
    };

    React.useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    borderRadius: 6,
                    background: listening ? "#666" : "#444",
                    cursor: "pointer",
                    alignItems: "center",
                }}
            >
                <span style={{ textTransform: "capitalize" }}>{action}</span>

                <button
                    onClick={beginListening}
                    style={{
                        padding: "4px 8px",
                        borderRadius: 4,
                        background: error ? "#b33" : "#888",
                        border: "none",
                        color: "white",
                        cursor: "pointer",
                        minWidth: 70,
                    }}
                >
                    {listening ? "Press..." : value.toUpperCase()}
                </button>
            </div>

            {error && (
                <div style={{ color: "#ff6666", fontSize: 12, textAlign: "right" }}>
                    {error}
                </div>
            )}
        </div>
    );
}
