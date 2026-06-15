import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Phone, PhoneCall, Repeat } from "lucide-react";
import { DashboardShell } from "@/components/tss/DashboardShell";
import { CountUp } from "@/components/tss/CountUp";
import { useFilters } from "@/lib/filters/FilterContext";
import { useDailySummary, useResolutionDaily, useResolutionDistribution, useSummaryTotals } from "@/hooks/useDashboardData";

export const Route = createFileRoute("/summary")({
  component: () => (
    <DashboardShell tab="summary">
      <SummaryContent />
    </DashboardShell>
  ),
});

function Bar({ value, max, color, delay = 0 }: { value: number; max: number; color: string; delay?: number }) {
  return (
    <div className="h-5 rounded" style={{ background: "var(--border-color)" }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${max > 0 ? (value / max) * 100 : 0}%` }}
        transition={{ duration: 0.7, delay, ease: "easeOut" }}
        className="h-full rounded"
        style={{ background: color }}
      />
    </div>
  );
}

function SummaryContent() {
  const { filters } = useFilters();
  const { data: totals, isLoading: totalsLoading } = useSummaryTotals(filters);
  const { data: rows = [], isLoading: rowsLoading } = useDailySummary(filters);
  const { data: resolutionRows = [] } = useResolutionDistribution(filters);
  const { data: resolutionDaily = [] } = useResolutionDaily(filters);
  const resolutionByDate = Object.fromEntries(
    resolutionDaily.map((r) => [r.day, r])
  );

  const resolutionTotal = resolutionRows.reduce((s, r) => s + r.cnt, 0);
  const resolutionLookup = Object.fromEntries(resolutionRows.map((r) => [r.resolution, r.cnt]));
  const resolutions = [
    { label: "Return",   value: resolutionLookup["RETURN"]   ?? 0, color: "var(--accent-teal)",   num: "var(--accent-teal)"   },
    { label: "Exchange", value: resolutionLookup["EXCHANGE"] ?? 0, color: "var(--accent-blue)",   num: "var(--accent-blue)"   },
    { label: "Cancel",   value: resolutionLookup["CANCEL"]   ?? 0, color: "var(--accent-red)",    num: "var(--accent-red)"    },
  ].map((r) => ({
    ...r,
    pct: resolutionTotal > 0 ? +((r.value / resolutionTotal) * 100).toFixed(1) : 0,
  }));

  const t = totals ?? {
    total_triggered: 0, full_completion: 0, partial_completion: 0,
    cpnf: 0, not_connected: 0, no_answer_disconnected: 0,
    voicemail: 0, callback_requested: 0, callback_no_time: 0,
    analyzer_issue: 0, out_of_scope: 0, failed_calls: 0,
  };

  // Derived funnel values
  const notConnTotal  = t.not_connected + t.no_answer_disconnected + t.voicemail;
  const mixedTotal    = t.callback_requested + t.callback_no_time + t.out_of_scope + t.analyzer_issue;
  const connectedTotal = t.full_completion + t.partial_completion + t.cpnf;
  const total          = t.total_triggered;

  const pct = (n: number) => total > 0 ? +((n / total) * 100).toFixed(1) : 0;

  const funnel = [
    { label: "Calls Initiated", value: total,          pct: 100,                color: "var(--text-primary)" },
    { label: "Not Connected",   value: notConnTotal,   pct: pct(notConnTotal),  color: "#bdbdbd" },
    { label: "Mixed",           value: mixedTotal,     pct: pct(mixedTotal),    color: "var(--accent-purple)" },
    { label: "Connected",       value: connectedTotal, pct: pct(connectedTotal), color: "#64b5f6" },
  ];

  const conn = [
    { label: "Connected",        value: connectedTotal,       pct: 100,                                    color: "#64b5f6",            num: "var(--accent-blue)" },
    { label: "Full Feedback",    value: t.full_completion,    pct: connectedTotal > 0 ? +((t.full_completion  / connectedTotal) * 100).toFixed(1) : 0, color: "var(--accent-teal)", num: "var(--accent-teal)" },
    { label: "Partial Feedback", value: t.partial_completion, pct: connectedTotal > 0 ? +((t.partial_completion / connectedTotal) * 100).toFixed(1) : 0, color: "#ef9a9a",           num: "var(--accent-red)" },
    { label: "No Feedback",      value: t.cpnf,               pct: connectedTotal > 0 ? +((t.cpnf            / connectedTotal) * 100).toFixed(1) : 0, color: "var(--accent-amber)", num: "var(--accent-amber)" },
  ];

  const cols = ["DATE","TOTAL","FULL","PARTIAL","FEEDBACK","FEEDBACK %","MIXED","NOT CONNECTED","EXCHANGE","CANCEL"];

  if (totalsLoading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Call Funnel */}
        <div className="tss-card p-5 flex flex-col">
          <div className="flex items-center gap-2 text-[11px] font-bold tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
            <Phone size={12} /> CALL FUNNEL
          </div>
          <div className="flex-1 flex flex-col justify-between gap-3">
            {funnel.map((r, i) => (
              <div key={r.label}>
                <div className="grid grid-cols-[140px_1fr_auto_50px] items-center gap-3">
                  <div className="text-[12px] font-medium">{r.label}</div>
                  <Bar value={r.value} max={total} color={r.color} delay={i * 0.1} />
                  <div className="text-sm font-bold tabular-nums">{r.value.toLocaleString()}</div>
                  <div className="text-[11px] text-right tabular-nums" style={{ color: "var(--text-secondary)" }}>{r.pct}%</div>
                </div>
                {i === 0 && (
                  <div className="mt-1 text-[11px] font-semibold" style={{ color: "var(--accent-red)" }}>
                    ▼ {(notConnTotal + mixedTotal).toLocaleString()} not connected or mixed · {pct(notConnTotal + mixedTotal)}%
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="text-[10px] mt-4" style={{ color: "var(--text-muted)" }}>
            <span className="font-semibold">Mixed breakdown:</span> Callback {t.callback_requested.toLocaleString()} · Callback (no time) {t.callback_no_time.toLocaleString()} · Out of Scope {t.out_of_scope.toLocaleString()} · Analyzer Issue {t.analyzer_issue.toLocaleString()}
          </div>
        </div>

        {/* Connected Breakdown */}
        <div className="tss-card p-5 flex flex-col">
          <div className="flex items-center gap-2 text-[11px] font-bold tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
            <PhoneCall size={12} /> CONNECTED BREAKDOWN
          </div>
          <div className="flex-1 flex flex-col justify-between gap-3">
            {conn.map((r, i) => (
              <div key={r.label} className="grid grid-cols-[140px_1fr_auto_50px] items-center gap-3">
                <div className="text-[12px] font-medium">{r.label}</div>
                <Bar value={r.value} max={connectedTotal} color={r.color} delay={i * 0.1} />
                <div className="text-sm font-bold tabular-nums" style={{ color: r.num }}>
                  <CountUp value={r.value} />
                </div>
                <div className="text-[11px] text-right tabular-nums" style={{ color: "var(--text-secondary)" }}>{r.pct}%</div>
              </div>
            ))}
          </div>
        </div>

        {/* Resolution Breakdown */}
        <div className="tss-card p-5 flex flex-col">
          <div className="flex items-center gap-2 text-[11px] font-bold tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
            <Repeat size={12} /> RESOLUTION BREAKDOWN
          </div>
          <div className="flex-1 flex flex-col justify-between gap-3">
            {resolutions.map((r, i) => (
              <div key={r.label} className="grid grid-cols-[140px_1fr_auto_50px] items-center gap-3">
                <div className="text-[12px] font-medium">{r.label}</div>
                <Bar value={r.value} max={resolutionTotal} color={r.color} delay={i * 0.1} />
                <div className="text-sm font-bold tabular-nums" style={{ color: r.num }}>
                  <CountUp value={r.value} />
                </div>
                <div className="text-[11px] text-right tabular-nums" style={{ color: "var(--text-secondary)" }}>{r.pct}%</div>
              </div>
            ))}
            {resolutionTotal === 0 && (
              <div className="text-[12px] py-2" style={{ color: "var(--text-muted)" }}>No resolution data for selected range</div>
            )}
          </div>
        </div>
      </div>

      {/* Daily Summary Table */}
      <div className="tss-card p-5">
        <div className="text-[11px] font-bold tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
          DAILY SUMMARY {rowsLoading && <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>loading…</span>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr style={{ background: "var(--table-stripe)" }}>
                {cols.map((c) => (
                  <th key={c} className="px-3 py-2 text-left text-[10px] font-bold tracking-wider whitespace-nowrap" style={{ color: "var(--text-muted)" }}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const feedback = r.full_completion + r.partial_completion;
                const mixed = r.callback_requested + r.callback_no_time + r.out_of_scope + r.analyzer_issue;
                const feedbackPct = r.total_triggered > 0
                  ? (feedback / r.total_triggered * 100).toFixed(1)
                  : "0.0";
                const res = resolutionByDate[r.date];
                return (
                  <motion.tr
                    key={r.date}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(0.4, i * 0.015) }}
                    style={{ background: i % 2 ? "var(--table-stripe)" : "transparent" }}
                  >
                    <td className="px-3 py-2 font-medium whitespace-nowrap">{r.date}</td>
                    <td className="px-3 py-2 tabular-nums">{r.total_triggered.toLocaleString()}</td>
                    <td className="px-3 py-2 tabular-nums font-bold" style={{ color: "var(--accent-teal)" }}>{r.full_completion.toLocaleString()}</td>
                    <td className="px-3 py-2 tabular-nums">{r.partial_completion.toLocaleString()}</td>
                    <td className="px-3 py-2 tabular-nums">{feedback.toLocaleString()}</td>
                    <td className="px-3 py-2 tabular-nums font-bold" style={{ color: parseFloat(feedbackPct) < 38 ? "var(--accent-red)" : "var(--text-primary)" }}>{feedbackPct}%</td>
                    <td className="px-3 py-2 tabular-nums">{mixed.toLocaleString()}</td>
                    <td className="px-3 py-2 tabular-nums">{r.not_connected.toLocaleString()}</td>
                    <td className="px-3 py-2 tabular-nums">{(res?.exchange_cnt ?? 0).toLocaleString()}</td>
                    <td className="px-3 py-2 tabular-nums">{(res?.cancel_cnt ?? 0).toLocaleString()}</td>
                  </motion.tr>
                );
              })}
              {rows.length === 0 && !rowsLoading && (
                <tr><td colSpan={10} className="px-3 py-8 text-center text-[12px]" style={{ color: "var(--text-muted)" }}>No data for selected date range</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-32">
      <div className="text-[13px]" style={{ color: "var(--text-muted)" }}>Loading…</div>
    </div>
  );
}
