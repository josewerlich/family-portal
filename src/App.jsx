import { useState } from "react";
import Finance from "./Finance.jsx";
import Workout from "./Workout.jsx";

function Home({ setPage }) {
  return (
    <div style={{ minHeight:"100vh", background:"#F7F4F0", fontFamily:"'DM Sans','Segoe UI',sans-serif", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:40 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');`}</style>
      <div style={{ marginBottom:48, textAlign:"center" }}>
        <h1 style={{ fontSize:42, fontWeight:700, margin:0, fontFamily:"'Playfair Display',serif", color:"#1A1714", letterSpacing:"-1px" }}>
          Werlich Family
        </h1>
        <p style={{ color:"#A09890", margin:"8px 0 0", fontSize:15, fontFamily:"'DM Sans',sans-serif" }}>Your personal portal</p>
      </div>

      <div style={{ display:"flex", gap:20, maxWidth:700, width:"100%" }}>
        <button onClick={() => setPage("finance")} style={{
          flex:1, background:"#FFFFFF", border:"1px solid #E8E2D9",
          borderRadius:24, padding:"32px 28px", cursor:"pointer", textAlign:"left",
          boxShadow:"0 4px 16px rgba(26,23,20,0.08)", transition:"all .2s",
        }}
        onMouseEnter={e=>e.currentTarget.style.boxShadow="0 8px 32px rgba(196,96,58,0.15)"}
        onMouseLeave={e=>e.currentTarget.style.boxShadow="0 4px 16px rgba(26,23,20,0.08)"}>
          <div style={{ fontSize:36, marginBottom:14 }}>💰</div>
          <div style={{ fontSize:20, fontWeight:700, fontFamily:"'Playfair Display',serif", color:"#1A1714", marginBottom:6 }}>Family Finances</div>
          <div style={{ fontSize:13, color:"#A09890", fontFamily:"'DM Sans',sans-serif", lineHeight:1.5 }}>Expenses, budget tracking & debt payoff planner</div>
          <div style={{ marginTop:20, fontSize:13, fontWeight:600, color:"#C4603A", fontFamily:"'DM Sans',sans-serif" }}>Open →</div>
        </button>

        <button onClick={() => setPage("workout")} style={{
          flex:1, background:"#FFFFFF", border:"1px solid #E8E2D9",
          borderRadius:24, padding:"32px 28px", cursor:"pointer", textAlign:"left",
          boxShadow:"0 4px 16px rgba(26,23,20,0.08)", transition:"all .2s",
        }}
        onMouseEnter={e=>e.currentTarget.style.boxShadow="0 8px 32px rgba(61,139,110,0.15)"}
        onMouseLeave={e=>e.currentTarget.style.boxShadow="0 4px 16px rgba(26,23,20,0.08)"}>
          <div style={{ fontSize:36, marginBottom:14 }}>💪</div>
          <div style={{ fontSize:20, fontWeight:700, fontFamily:"'Playfair Display',serif", color:"#1A1714", marginBottom:6 }}>Workouts</div>
          <div style={{ fontSize:13, color:"#A09890", fontFamily:"'DM Sans',sans-serif", lineHeight:1.5 }}>Daily exercise routines, timers & progress tracking</div>
          <div style={{ marginTop:20, fontSize:13, fontWeight:600, color:"#3D8B6E", fontFamily:"'DM Sans',sans-serif" }}>Open →</div>
        </button>
      </div>

      <p style={{ color:"#D4CFC8", fontSize:12, marginTop:48, fontFamily:"'DM Sans',sans-serif" }}>familyfinances.uk</p>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState("home");
  if (page === "finance") return <Finance onBack={() => setPage("home")} />;
  if (page === "workout") return <Workout onBack={() => setPage("home")} />;
  return <Home setPage={setPage} />;
}
