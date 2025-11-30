import { useKeybinds } from "../state/KeybindsContext";
import React from "react";

const defaultKeybinds = {
  hotbar1: "1",
  hotbar2: "2",
  hotbar3: "3",
  hotbar4: "4",
  hotbar5: "5",
  hotbar6: "6",
  hotbar7: "7",
  hotbar8: "8",
  hotbar9: "9",
  offhand: "f",
  drop: "q",
};

export default function SettingsPage() {
  const { keybinds, setKeybind, setKeybinds } = useKeybinds();

  const actions = Object.keys(keybinds) as (keyof typeof keybinds)[];

  const handleReset = () => {
        setKeybinds((_) => {
            localStorage.setItem("keybinds", JSON.stringify(defaultKeybinds));
            return { ...defaultKeybinds };
        });
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
          maxWidth: 400,
          width: "100%",
          padding: 24,
          borderRadius: 12,
          background: "#2c2c2c",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          textAlign: "center",
        }}
      >
        <h1 style={{ margin: 0 }}>Settings</h1>
        <h2 style={{ margin: 0 }}>Keybinds</h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {actions.map((action) => (
            <KeybindRow
              key={action}
              action={action}
              value={keybinds[action]}
              allKeybinds={keybinds}
              onChange={setKeybind}
            />
          ))}
        </div>

        <button
          onClick={handleReset}
          style={{
            marginTop: 16,
            padding: "10px 16px",
            borderRadius: 6,
            color: "white",
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
  onChange: (action: string, key: string) => void;
  allKeybinds: Record<string, string>;
}) {
  const [listening, setListening] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const timeoutRef = React.useRef<number | null>(null);

  const listen = () => {
    if (listening) return;
    setListening(true);
    setError(null);

    const handle = (e: KeyboardEvent) => {
      e.preventDefault();
      const key = e.key.toLowerCase();

      const duplicate = Object.entries(allKeybinds).find(
        ([otherAction, k]) => otherAction !== action && k.toLowerCase() === key
      );

      if (duplicate) {
        setError(`Key "${key.toUpperCase()}" is already bound to ${duplicate[0]}`);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = window.setTimeout(() => setError(null), 1000);
      } else {
        onChange(action, key);
      }

      setListening(false);
      window.removeEventListener("keydown", handle);
    };

    window.addEventListener("keydown", handle);
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
          background: listening ? "#555" : "#444",
          cursor: "pointer",
          alignItems: "center",
          fontWeight: 500,
        }}
      >
        <span style={{ textTransform: "capitalize" }}>{action}</span>
        <button
          ref={buttonRef}
          onClick={listen}
          style={{
            padding: "4px 8px",
            borderRadius: 4,
            border: "none",
            background: error ? "#b33" : "#888",
            color: "white",
            fontWeight: "bold",
            cursor: "pointer",
            minWidth: 60,
          }}
        >
          {listening ? "Press key..." : value.toUpperCase()}
        </button>
      </div>
    </div>
  );
}


