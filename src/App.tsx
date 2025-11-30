import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import HomePage from "./pages/HomePage";
import GamePage from "./pages/GamePage";
import EditorPage from "./pages/EditorPage";
import SandboxPage from "./pages/SandboxPage";
import { Header, Footer } from "./components/Layout";
import SettingsPage from "./pages/SettingsPage";
import { AnimatePresence } from "framer-motion";
import { PageTransition } from "./components/PageTransition";
import { useEffect } from "react";
import { playClickSound } from "./utils/SoundUtils";

export default function App() {
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if ((e.target as HTMLElement).tagName === "BUTTON") {
        playClickSound();
      }
    };

    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);
  const location = useLocation();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "98vh",
      }}
    >
      <Header />

      <main style={{ flexGrow: 1 }}>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<PageTransition><HomePage /></PageTransition>} />
            <Route path="/game" element={<PageTransition><GamePage /></PageTransition>} />
            <Route path="/edit" element={<PageTransition><EditorPage /></PageTransition>} />
            <Route path="/sandbox" element={<PageTransition><SandboxPage /></PageTransition>} />
            <Route path="/settings" element={<PageTransition><SettingsPage /></PageTransition>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  );
}
