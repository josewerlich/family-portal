import { useState } from "react";
import Finance from "./Finance.jsx";
import Workout from "./Workout.jsx";

function Home({ setPage }) {
  return (
    <div style={{ minHeight:"100vh", background:"#0a0f1a", color:"#f1f5f9", fontFamily:"'DM Sans','Segoe UI',sans-serif", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24 }}>
      <div style={{ marginBottom:32, textAlign:"center" }}>
        <h1 style={{ fontSize:28, fontWeight:900, margin:0, letterSpacing:"-1px" }}>
          <span style={{ color:"#4ade80" }}>Werlich</span> Family
        </h1>
        <p style={{ color:"#475569", margin:"6px 0 0", fontSize:14 }}>Your personal portal</p>
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:16, width:"100%", maxWidth:340 }}>
        <button onClick={() => setPage("finance")} style={{
          background:"linear-gradient(135deg,#0f172a,#1e293b)", border:"1px solid #4ade80",
          borderRadius:20, padding:"24px 20px", cursor:"pointer", textAlign:"left",
          transition:"all .2s", color:"#f1f5f9"
        }}>
          <div style={{ fontSize:32, marginBottom:8 }}>💰</div>
          <div style={{ fontSize:18, fontWeight:800 }}>Family Finances</div>
          <div style={{ fontSize:13, color:"#64748b", marginTop:4 }}>Expenses, budget & debt tracker</div>
        </button>

        <button onClick={() => setPage("workout")} style={{
          background:"linear-gradient(135deg,#0f172a,#1e293b)", border:"1px solid #38bdf8",
          borderRadius:20, padding:"24px 20px", cursor:"pointer", textAlign:"left",
          transition:"all .2s", color:"#f1f5f9"
        }}>
          <div style={{ fontSize:32, marginBottom:8 }}>💪</div>
          <div style={{ fontSize:18, fontWeight:800 }}>Workouts</div>
          <div style={{ fontSize:13, color:"#64748b", marginTop:4 }}>Exercise tracker & routines</div>
        </button>
      </div>

      <p style={{ color:"#1e293b", fontSize:11, marginTop:40 }}>familyfinances.uk</p>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState("home");
  if (page === "finance") return <Finance onBack={() => setPage("home")} />;
  if (page === "workout") return <Workout onBack={() => setPage("home")} />;
  return <Home setPage={setPage} />;
}
