import { motion } from "framer-motion";
import { Download } from "lucide-react";
import { useState } from "react";
import { useFilters } from "@/lib/filters/FilterContext";
import { exportRawCsv } from "@/lib/exportCsv";

export function FilterBar() {
  const { filters, setFilters, resetFilters, minDate, maxDate } = useFilters();
  const [exporting, setExporting] = useState(false);

  const presets = buildPresets(minDate, maxDate);

  function applyPreset(from: string, to: string) {
    setFilters({ dateFrom: from, dateTo: to });
  }

  async function handleExport() {
    if (exporting) return;
    setExporting(true);
    try {
      await exportRawCsv(filters);
    } finally {
      setExporting(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="px-6 py-3 border-b"
      style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
    >
      <div className="flex flex-wrap items-end gap-4">
        {/* Date presets */}
        <div>
          <div className="text-[10px] font-bold tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>DATE PRESET</div>
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => applyPreset(minDate, maxDate)}
              className="text-[10px] font-bold px-2.5 py-1 rounded-md"
              style={{
                background: filters.dateFrom === minDate && filters.dateTo === maxDate ? "var(--accent-red)" : "transparent",
                color: filters.dateFrom === minDate && filters.dateTo === maxDate ? "#fff" : "var(--text-secondary)",
                border: `1px solid ${filters.dateFrom === minDate && filters.dateTo === maxDate ? "var(--accent-red)" : "var(--border-color)"}`,
              }}
            >
              ALL
            </button>
            {presets.map((p) => {
              const active = filters.dateFrom === p.from && filters.dateTo === p.to;
              return (
                <button
                  key={p.label}
                  onClick={() => applyPreset(p.from, p.to)}
                  className="text-[10px] font-bold px-2.5 py-1 rounded-md"
                  style={{
                    background: active ? "var(--accent-red)" : "transparent",
                    color: active ? "#fff" : "var(--text-secondary)",
                    border: `1px solid ${active ? "var(--accent-red)" : "var(--border-color)"}`,
                  }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        <Field label="FROM">
          <input
            type="date"
            value={filters.dateFrom}
            min={minDate}
            max={filters.dateTo}
            onChange={(e) => setFilters({ dateFrom: e.target.value })}
            className="tss-input"
          />
        </Field>

        <Field label="TO">
          <input
            type="date"
            value={filters.dateTo}
            min={filters.dateFrom}
            max={maxDate}
            onChange={(e) => setFilters({ dateTo: e.target.value })}
            className="tss-input"
          />
        </Field>

        <button
          onClick={resetFilters}
          className="text-[10px] font-bold px-3 py-1.5 rounded-md self-end"
          style={{ color: "var(--text-secondary)", border: "1px solid var(--border-color)" }}
        >
          RESET
        </button>
      </div>

      <div className="flex items-center gap-2 mt-3">
        <span className="inline-flex items-center text-[11px] font-bold text-white px-2.5 py-1 rounded-md" style={{ background: "var(--accent-red)" }}>
          {filters.dateFrom} → {filters.dateTo}
        </span>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-md border disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ color: "var(--accent-red)", borderColor: "var(--accent-red)" }}
        >
          <Download size={12} /> {exporting ? "Exporting…" : "RAW CSV"}
        </button>
      </div>
    </motion.div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-bold tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>{label}</div>
      {children}
    </div>
  );
}

// Build month/year preset buttons from the actual date range in the DB
function buildPresets(minDate: string, maxDate: string): { label: string; from: string; to: string }[] {
  if (!minDate || !maxDate) return [];
  const presets: { label: string; from: string; to: string }[] = [];
  const start = new Date(minDate + "T00:00:00");
  const end   = new Date(maxDate + "T00:00:00");

  const seen = new Set<string>();
  const cur = new Date(start);
  while (cur <= end) {
    const y = cur.getFullYear();
    const m = cur.getMonth(); // 0-indexed
    const key = `${y}-${m}`;
    if (!seen.has(key)) {
      seen.add(key);
      const monthStart = new Date(y, m, 1);
      const monthEnd   = new Date(y, m + 1, 0);
      const from = clamp(monthStart, start, end);
      const to   = clamp(monthEnd,   start, end);
      const label = monthStart.toLocaleString("en", { month: "short", year: "2-digit" }).toUpperCase().replace(" ", "'");
      presets.push({ label, from: fmt(from), to: fmt(to) });
    }
    cur.setMonth(cur.getMonth() + 1);
  }
  return presets;
}

function clamp(d: Date, min: Date, max: Date) {
  if (d < min) return min;
  if (d > max) return max;
  return d;
}

function fmt(d: Date) {
  return d.toISOString().slice(0, 10);
}
