import { useEffect, useRef, useState } from "react";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

interface Props {
  /** Render prop — receives the current height so ResponsiveContainer can re-render at that size */
  children: (height: number) => React.ReactNode;
  baseHeight?: number;
  className?: string;
}

const BTN: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "center",
  width: 22, height: 22, border: "none", background: "transparent",
  cursor: "pointer", borderRadius: 4, padding: 0,
  color: "var(--text-secondary)",
};

export function ZoomableChart({ children, baseHeight = 280, className }: Props) {
  const [zoom, setZoom] = useState(1);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Ctrl / Cmd + scroll → zoom
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setZoom((z) => parseFloat(Math.min(4, Math.max(0.5, z - e.deltaY / 400)).toFixed(2)));
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  const h   = Math.round(baseHeight * zoom);
  const pct = Math.round(zoom * 100);

  return (
    <div className={className} style={{ position: "relative" }}>

      {/* ── Zoom controls ── */}
      <div style={{
        position: "absolute", top: 2, right: 2, zIndex: 20,
        display: "flex", alignItems: "center", gap: 2,
        padding: "2px 4px", borderRadius: 6,
        background: "var(--bg-card)", border: "1px solid var(--border-color)",
        boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
      }}>
        {zoom !== 1 && (
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.5px", paddingRight: 2, color: "var(--accent-red)" }}>
            {pct}%
          </span>
        )}
        <button onClick={() => setZoom((z) => parseFloat(Math.min(4, z + 0.25).toFixed(2)))} title="Zoom in  (Ctrl + scroll)" style={BTN}>
          <ZoomIn size={12} />
        </button>
        {zoom !== 1 && (
          <button onClick={() => setZoom(1)} title="Reset zoom" style={BTN}>
            <RotateCcw size={12} />
          </button>
        )}
        <button onClick={() => setZoom((z) => parseFloat(Math.max(0.5, z - 0.25).toFixed(2)))} title="Zoom out" style={BTN}>
          <ZoomOut size={12} />
        </button>
      </div>

      {/* ── Scrollable chart area ── */}
      <div
        ref={wrapRef}
        style={{
          overflow: "auto",
          height: baseHeight,
          borderRadius: 4,
          // subtle scroll indicator when content overflows
          scrollbarWidth: "thin",
          scrollbarColor: "var(--accent-red) transparent",
        }}
      >
        <div style={{ width: zoom > 1 ? `${zoom * 100}%` : "100%", height: h, minWidth: "100%" }}>
          {children(h)}
        </div>
      </div>

      {/* ── Hint line ── */}
      {zoom !== 1 && (
        <p style={{
          textAlign: "center", fontSize: 9, marginTop: 4,
          color: "var(--text-muted)", letterSpacing: "0.4px",
        }}>
          Ctrl + scroll to zoom · drag scrollbar to pan
        </p>
      )}
    </div>
  );
}
