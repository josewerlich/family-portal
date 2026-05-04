export default function Workout({ onBack }) {
  return (
    <div style={{ minHeight:"100vh", background:"#0a0f1a", color:"#f1f5f9", fontFamily:"'DM Sans','Segoe UI',sans-serif", padding:24 }}>
      <button onClick={onBack} style={{ background:"none", border:"none", color:"#64748b", cursor:"pointer", fontSize:13, marginBottom:20, padding:0 }}>← Back</button>
      <h1 style={{ fontSize:22, fontWeight:800, margin:"0 0 8px" }}>💪 Workouts</h1>
      <p style={{ color:"#475569", fontSize:13 }}>Workout tracker coming soon.</p>
    </div>
  );
}
