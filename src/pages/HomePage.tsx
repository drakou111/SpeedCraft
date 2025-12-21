import { useNavigate } from "react-router-dom";
import predefinedGames from "../data/games/games.json" with { type: "json" };
import { Brush, Package } from "lucide-react";

export default function HomePage() {
    const navigate = useNavigate();

    return (
        <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "40px",
            margin: 24,
        }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px", imageRendering: "pixelated" }}>
                <img
                    src="./logo.png"
                    alt="SpeedCraft Logo"
                    style={{ width: 80, height: 80, objectFit: "cover" }}
                />
                <h1 style={{ fontSize: "48px", margin: 0 }}>SpeedCraft</h1>
            </div>

            <p style={{ maxWidth: 600, textAlign: "center", fontSize: "18px", lineHeight: 1.6 }}>
                Welcome to SpeedCraft! This website let's you create and share different minecraft crafting challenges.
            </p>

            <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
                <button
                    onClick={() => navigate("/edit")}
                    style={buttonStyle}
                >
                    Create
                    <Brush size={32} style={{ transform: "translateX(4px) translateY(4px)" }} />
                </button>
                <button
                    onClick={() => navigate("/sandbox")}
                    style={buttonStyle}
                >
                    Sandbox
                    <Package size={32} style={{ transform: "translateX(4px) translateY(4px)" }} />
                </button>
            </div>

            <div style={{ width: "100%", maxWidth: 800 }}>
                <h2 style={{ textAlign: "center", marginBottom: "20px" }}>Browse Games</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {predefinedGames.map((game, idx) => (
                        <div
                            key={idx}
                            style={{
                                background: "#2a2a2a",
                                padding: "16px",
                                borderRadius: 12,
                                boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                transition: "transform 0.2s",
                            }}
                            onClick={() => navigate(`/game?data=${encodeURIComponent(game.data)}`)}
                            onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.03)")}
                            onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
                        >
                            {/* Left side: title + description */}
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                <h3 style={{ margin: 0 }}>{game.title}</h3>
                                <p style={{ margin: 0, fontSize: "14px", color: "#ccc" }}>{game.description}</p>
                            </div>

                            {/* Right side: icon */}
                            {game.icon && (
                                <img
                                    src={`./items/${game.icon}`}
                                    alt={game.title}
                                    style={{ width: 64, height: 64, objectFit: "contain", imageRendering: "pixelated" }}
                                />
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

const buttonStyle: React.CSSProperties = {
    padding: "12px 24px",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: 32
};
