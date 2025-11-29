import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import HomePage from "./pages/HomePage";
import GamePage from "./pages/GamePage";
import EditorPage from "./pages/EditorPage";
import SandboxPage from "./pages/SandboxPage";
import { Header, Footer } from "./components/Layout";

export default function App() {
  return (
    <HashRouter>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          minHeight: "98vh",
        }}
      >
        <Header />
        
        <main style={{ flexGrow: 1 }}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/game" element={<GamePage />} />
            <Route path="/edit" element={<EditorPage />} />
            <Route path="/sandbox" element={<SandboxPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        
        <Footer />
      </div>
    </HashRouter>
  );
}
