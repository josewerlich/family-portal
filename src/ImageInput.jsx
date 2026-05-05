// Reusable image input component with paste zone + camera button
import { useRef, useEffect } from "react";

const C = {
  terra:"#C4603A", terra3:"#F5E6DF", surface:"#FFFFFF", surface2:"#F0EDE8",
  border:"#E8E2D9", border2:"#D4CFC8", text:"#1A1714", text2:"#6B6560", text3:"#A09890",
  green:"#3D8B6E",
};

export default function ImageInput({ onFiles, label = "Upload", accept = ".csv,.pdf,image/*", multiple = true, compact = false }) {
  const fileRef = useRef();
  const pasteRef = useRef();
  const cameraRef = useRef();

  // Listen for paste events on the paste zone
  useEffect(() => {
    const zone = pasteRef.current;
    if (!zone) return;

    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const files = [];
      for (const item of items) {
        if (item.kind === "file") {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }
      if (files.length > 0) {
        e.preventDefault();
        onFiles(files);
      }
    };

    zone.addEventListener("paste", handlePaste);
    return () => zone.removeEventListener("paste", handlePaste);
  }, [onFiles]);

  // Also listen globally for paste when this component is mounted
  useEffect(() => {
    const handleGlobalPaste = (e) => {
      // Only if no input/textarea is focused
      const active = document.activeElement;
      if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.tagName === "SELECT")) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      const files = [];
      for (const item of items) {
        if (item.kind === "file") {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }
      if (files.length > 0) onFiles(files);
    };
    document.addEventListener("paste", handleGlobalPaste);
    return () => document.removeEventListener("paste", handleGlobalPaste);
  }, [onFiles]);

  if (compact) {
    // Compact version for debt modal
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {/* Hidden inputs */}
        <input ref={fileRef} type="file" multiple={multiple} accept={accept} style={{ display: "none" }}
          onChange={e => onFiles(Array.from(e.target.files))} />
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }}
          onChange={e => onFiles(Array.from(e.target.files))} />

        {/* Three action buttons */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          <button type="button" onClick={() => cameraRef.current.click()} style={{
            padding: "12px 8px", borderRadius: 12, border: `1px solid ${C.border2}`,
            background: C.surface2, color: C.text2, fontSize: 12, fontWeight: 600,
            cursor: "pointer", fontFamily: "'DM Sans',sans-serif", textAlign: "center",
          }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>📷</div>
            Camera
          </button>
          <button type="button" onClick={() => fileRef.current.click()} style={{
            padding: "12px 8px", borderRadius: 12, border: `1px solid ${C.border2}`,
            background: C.surface2, color: C.text2, fontSize: 12, fontWeight: 600,
            cursor: "pointer", fontFamily: "'DM Sans',sans-serif", textAlign: "center",
          }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>🖼️</div>
            Gallery
          </button>
          <div
            ref={pasteRef}
            tabIndex={0}
            style={{
              padding: "12px 8px", borderRadius: 12, border: `1px dashed ${C.terra}`,
              background: C.terra3, color: C.terra, fontSize: 12, fontWeight: 600,
              cursor: "text", fontFamily: "'DM Sans',sans-serif", textAlign: "center",
              outline: "none",
            }}
            onFocus={e => e.currentTarget.style.border = `2px dashed ${C.terra}`}
            onBlur={e => e.currentTarget.style.border = `1px dashed ${C.terra}`}
          >
            <div style={{ fontSize: 20, marginBottom: 4 }}>📋</div>
            Tap & Paste
          </div>
        </div>
        <div style={{ fontSize: 11, color: C.text3, textAlign: "center", fontFamily: "'DM Sans',sans-serif" }}>
          Tap & Paste → long press → Paste (iOS)
        </div>
      </div>
    );
  }

  // Full version for upload tab
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Hidden inputs */}
      <input ref={fileRef} type="file" multiple={multiple} accept={accept} style={{ display: "none" }}
        onChange={e => onFiles(Array.from(e.target.files))} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }}
        onChange={e => onFiles(Array.from(e.target.files))} />

      {/* Main paste zone */}
      <div
        ref={pasteRef}
        tabIndex={0}
        style={{
          border: `2px dashed ${C.terra}`, borderRadius: 16, padding: "28px 20px",
          textAlign: "center", background: C.terra3, cursor: "text", outline: "none",
          transition: "all .2s",
        }}
        onFocus={e => e.currentTarget.style.background = "#FDDDD0"}
        onBlur={e => e.currentTarget.style.background = C.terra3}
      >
        <div style={{ fontSize: 32, marginBottom: 10 }}>📋</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.terra, fontFamily: "'DM Sans',sans-serif", marginBottom: 4 }}>
          Tap here, then long press → Paste
        </div>
        <div style={{ fontSize: 12, color: C.text3, fontFamily: "'DM Sans',sans-serif" }}>
          Works with screenshots and copied images on iPhone
        </div>
      </div>

      {/* Divider */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1, height: 1, background: C.border2 }} />
        <span style={{ fontSize: 11, color: C.text3, fontFamily: "'DM Sans',sans-serif" }}>or</span>
        <div style={{ flex: 1, height: 1, background: C.border2 }} />
      </div>

      {/* Action buttons row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <button type="button" onClick={() => cameraRef.current.click()} style={{
          padding: "14px", borderRadius: 14, border: `1px solid ${C.border2}`,
          background: C.surface, color: C.text, fontSize: 13, fontWeight: 600,
          cursor: "pointer", fontFamily: "'DM Sans',sans-serif",
          boxShadow: "0 1px 3px rgba(26,23,20,0.08)",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          <span style={{ fontSize: 20 }}>📷</span> Take Photo
        </button>
        <button type="button" onClick={() => fileRef.current.click()} style={{
          padding: "14px", borderRadius: 14, border: `1px solid ${C.border2}`,
          background: C.surface, color: C.text, fontSize: 13, fontWeight: 600,
          cursor: "pointer", fontFamily: "'DM Sans',sans-serif",
          boxShadow: "0 1px 3px rgba(26,23,20,0.08)",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          <span style={{ fontSize: 20 }}>📁</span> Browse Files
        </button>
      </div>
    </div>
  );
}
