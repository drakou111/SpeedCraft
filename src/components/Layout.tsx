import { useNavigate, useLocation } from "react-router-dom";

export function Header() {
    const navigate = useNavigate();
    const location = useLocation();

    const navItems = [
        { label: "Home", path: "/" },
        { label: "Editor", path: "/edit" },
        { label: "Sandbox", path: "/sandbox" },
        { label: "Settings", path: "/settings" },
    ];

    return (
        <header style={{
            backgroundColor: "#222",
            color: "#f0f0f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 24px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
            position: "sticky",
            top: 0,
            zIndex: 1000
        }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer", imageRendering: "pixelated" }} onClick={() => navigate("/")}>
                <img src="./logo.png" alt="Logo" style={{ width: 40, height: 40, objectFit: "cover" }} />
                <span style={{ fontSize: 32, fontWeight: 600 }}>SpeedCraft</span>
            </div>

            <nav style={{ display: "flex", gap: "20px" }}>
                {navItems.map(item => (
                    <span
                        key={item.path}
                        onClick={() => navigate(item.path)}
                        style={{
                            cursor: "pointer",
                            fontSize: 24,
                            fontWeight: location.pathname === item.path ? 700 : 500,
                            color: location.pathname === item.path ? "#f0a500" : "#f0f0f0",
                            transition: "color 0.2s",
                        }}
                        onMouseEnter={e => (e.currentTarget.style.color = "#f0a500")}
                        onMouseLeave={e => (e.currentTarget.style.color = location.pathname === item.path ? "#f0a500" : "#f0f0f0")}
                    >
                        {item.label}
                    </span>
                ))}
            </nav>
        </header>
    );
}

export function Footer() {
    return (
        <footer style={{
            width: "100%",
            backgroundColor: "#222",
            color: "#ccc",
            textAlign: "center",
            padding: "16px 0",
            marginTop: "auto",
            boxShadow: "0 -2px 8px rgba(0,0,0,0.3)"
        }}>
            <p style={{ margin: 0 }}>© {new Date().getFullYear()} SpeedCraft, by Drakou111. All rights reserved.</p>
            <p> 
                <a href="https://github.com/drakou111" target="_blank" >GitHub</a>
                <a href="https://www.youtube.com/@drakou111" target="_blank" >  Youtube</a>
                <a href="https://ko-fi.com/drakou111" target="_blank" >  Ko-fi</a>
            </p>
                    
        </footer>
    );
}
