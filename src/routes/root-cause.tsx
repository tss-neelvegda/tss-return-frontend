import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { DashboardShell } from "@/components/tss/DashboardShell";
import { useFilters } from "@/lib/filters/FilterContext";
import {
  useInsightsSummary, useRootCauseL1, useRootCauseL2, useRootCauseL3,
  type CatCount,
} from "@/hooks/useDashboardData";

export const Route = createFileRoute("/root-cause")({
  component: () => (
    <DashboardShell tab="rootCause">
      <RootCauseContent />
    </DashboardShell>
  ),
});

function Quadrant({
  n, title, badge, color, items, isLoading, selected, onSelect, dim,
}: {
  n: number; title: string; badge: string; color: string;
  items: CatCount[]; isLoading?: boolean;
  selected: string | null; onSelect: (name: string) => void; dim?: boolean;
}) {
  const max = Math.max(...items.map((i) => i.cnt), 1);
  return (
    <div className="tss-card p-5" style={{ opacity: dim ? 0.5 : 1, transition: "opacity 0.2s" }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold text-white" style={{ background: color }}>{n}</span>
          <span className="text-[12px] font-bold tracking-wider">{title}</span>
          {badge && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "var(--accent-red-soft)", color: "var(--accent-red)" }}>{badge}</span>
          )}
        </div>
        <div className="flex gap-2 text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>
          {selected && (
            <button onClick={() => onSelect(selected)} style={{ color: "var(--accent-red)" }}>CLEAR</button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-[12px]" style={{ color: "var(--text-muted)" }}>Loading…</div>
      ) : items.length === 0 ? (
        <div className="py-8 text-center text-[12px]" style={{ color: "var(--text-muted)" }}>
          {dim ? "Select a value above to drill down" : "No data for selected range"}
        </div>
      ) : (
        <div className="space-y-1.5 max-h-96 overflow-y-auto">
          {items.map((it, i) => {
            const active = selected === it.cat;
            return (
              <button
                key={it.cat}
                onClick={() => onSelect(it.cat)}
                className="w-full grid grid-cols-[16px_1fr_auto_70px] items-center gap-2 px-2 py-1.5 rounded text-left"
                style={{ background: active ? "var(--accent-red-soft)" : "transparent" }}
              >
                <input type="checkbox" checked={active} readOnly style={{ accentColor: color }} />
                <span className="text-[12px] truncate">{it.cat}</span>
                <span className="text-[11px] font-bold tabular-nums">{it.cnt.toLocaleString()}</span>
                <div className="h-1.5 rounded" style={{ background: "var(--border-color)" }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(it.cnt / max) * 100}%` }}
                    transition={{ duration: 0.5, delay: i * 0.02 }}
                    className="h-full rounded"
                    style={{ background: color, opacity: active ? 1 : 0.5 }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RootCauseContent() {
  const { filters } = useFilters();
  const [selSg, setSelSg] = useState<string | null>(null);
  const [selL1, setSelL1] = useState<string | null>(null);
  const [selL2, setSelL2] = useState<string | null>(null);
  const [selL3, setSelL3] = useState<string | null>(null);

  const { data: insightsRows = [], isLoading: sgLoading } = useInsightsSummary(filters);
  const { data: l1Data = [], isLoading: l1Loading } = useRootCauseL1(filters, selSg);
  const { data: l2Data = [], isLoading: l2Loading } = useRootCauseL2(filters, selL1, selSg);
  const { data: l3Data = [], isLoading: l3Loading } = useRootCauseL3(filters, selL2, selSg);

  const sgItems: CatCount[] = insightsRows.map((r) => ({ cat: r.size_group, cnt: r.total }));

  function selectSg(name: string) {
    setSelSg((prev) => (prev === name ? null : name));
    setSelL1(null);
    setSelL2(null);
    setSelL3(null);
  }
  function selectL1(name: string) {
    setSelL1((prev) => (prev === name ? null : name));
    setSelL2(null);
    setSelL3(null);
  }
  function selectL2(name: string) {
    setSelL2((prev) => (prev === name ? null : name));
    setSelL3(null);
  }
  function selectL3(name: string) {
    setSelL3((prev) => (prev === name ? null : name));
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Quadrant
        n={1} title="PRODUCT CATEGORY" badge="SG" color="var(--accent-blue)"
        items={sgItems} isLoading={sgLoading}
        selected={selSg} onSelect={selectSg}
      />
      <Quadrant
        n={2} title="L1" badge="L1" color="var(--accent-red)"
        items={l1Data} isLoading={l1Loading}
        selected={selL1} onSelect={selectL1}
        dim={!selSg}
      />
      <Quadrant
        n={3} title="L2" badge="L2" color="var(--accent-purple)"
        items={l2Data} isLoading={l2Loading}
        selected={selL2} onSelect={selectL2}
        dim={!selL1}
      />
      <Quadrant
        n={4} title="L3" badge="L3" color="var(--accent-amber)"
        items={l3Data} isLoading={l3Loading}
        selected={selL3} onSelect={selectL3}
        dim={!selL2}
      />
    </div>
  );
}
