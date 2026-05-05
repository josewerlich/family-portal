import { useState } from "react";
import Finance from "./Finance.jsx";
import Workout from "./Workout.jsx";

function Home({ setPage }) {
  return (
    <div style={{ minHeight:"100vh", background:"#F7F4F0", fontFamily:"'DM Sans','Segoe UI',sans-serif", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"40px 20px" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');`}</style>
      <div style={{ marginBottom:40, textAlign:"center" }}>
        <h1 style={{ fontSize:"clamp(28px,5vw,42px)", fontWeight:700, margin:0, fontFamily:"'Playfair Display',serif", color:"#1A1714", letterSpacing:"-1px" }}>
          Werlich Family
        </h1>
        <p style={{ color:"#A09890", margin:"8px 0 0", fontSize:15, fontFamily:"'DM Sans',sans-serif" }}>Your personal portal</p>
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:16, maxWidth:420, width:"100%" }}>
        <button onClick={() => setPage("finance")} style={{
          background:"#FFFFFF", border:"1px solid #E8E2D9", borderRadius:20,
          padding:"28px 24px", cursor:"pointer", textAlign:"left",
          boxShadow:"0 4px 16px rgba(26,23,20,0.08)", width:"100%",
        }}>
          <div style={{ fontSize:32, marginBottom:12 }}>💰</div>
          <div style={{ fontSize:19, fontWeight:700, fontFamily:"'Playfair Display',serif", color:"#1A1714", marginBottom:5 }}>Family Finances</div>
          <div style={{ fontSize:13, color:"#A09890", fontFamily:"'DM Sans',sans-serif", lineHeight:1.5, marginBottom:16 }}>Expenses, budget tracking & debt payoff planner</div>
          <div style={{ fontSize:13, fontWeight:600, color:"#C4603A", fontFamily:"'DM Sans',sans-serif" }}>Open →</div>
        </button>

        <button onClick={() => setPage("workout")} style={{
          background:"#FFFFFF", border:"1px solid #E8E2D9", borderRadius:20,
          padding:"28px 24px", cursor:"pointer", textAlign:"left",
          boxShadow:"0 4px 16px rgba(26,23,20,0.08)", width:"100%",
        }}>
          <div style={{ fontSize:32, marginBottom:12 }}>💪</div>
          <div style={{ fontSize:19, fontWeight:700, fontFamily:"'Playfair Display',serif", color:"#1A1714", marginBottom:5 }}>Workouts</div>
          <div style={{ fontSize:13, color:"#A09890", fontFamily:"'DM Sans',sans-serif", lineHeight:1.5, marginBottom:16 }}>Daily exercise routines, timers & progress tracking</div>
          <div style={{ fontSize:13, fontWeight:600, color:"#3D8B6E", fontFamily:"'DM Sans',sans-serif" }}>Open →</div>
        </button>
      </div>

      <p style={{ color:"#D4CFC8", fontSize:12, marginTop:40, fontFamily:"'DM Sans',sans-serif" }}>familyfinances.uk</p>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState("home");
  if (page === "finance") return <Finance onBack={() => setPage("home")} />;
  if (page === "workout") return <Workout onBack={() => setPage("home")} />;
  return <Home setPage={setPage} />;
}
