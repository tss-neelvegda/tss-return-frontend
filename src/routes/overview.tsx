import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Bar, BarChart, Brush, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis, Area, AreaChart,
} from "recharts";
import { DashboardShell } from "@/components/tss/DashboardShell";
import { ZoomableChart } from "@/components/tss/ZoomableChart";
import { CountUp } from "@/components/tss/CountUp";
import { useFilters } from "@/lib/filters/FilterContext";
import {
  useSummaryTotals, useTopCategories, useTopProducts,
  useReturnsTimeline, useOutcomeDistribution,
} from "@/hooks/useDashboardData";

export const Route = createFileRoute("/overview")({
  component: () => (
    <DashboardShell tab="overview">
      <OverviewContent />
    </DashboardShell>
  ),
});

const OUTCOME_COLORS: Record<string, string> = {
  FULL_COMPLETION:                 "var(--accent-teal)",
  PARTIAL_COMPLETION:              "#ef9a9a",
  CUSTOMER_PREFERENCE_NO_FEEDBACK: "var(--accent-amber)",
  NOT_CONNECTED:                   "var(--accent-gray, #9e9e9e)",
  NO_ANSWER_DISCONNECTED:          "#bdbdbd",
  VOICEMAIL_DETECTED:              "var(--accent-purple)",
  CALLBACK_REQUESTED:              "var(--accent-blue)",
  CALLBACK_REQUESTED_NO_TIME:      "#90caf9",
  CALL_ANALYZER_ISSUE:             "var(--accent-pink)",
  OUT_OF_SCOPE:                    "var(--accent-red)",
};

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="tss-card p-4">
      <div className="mb-2">
        <div className="text-[11px] font-bold tracking-wider" style={{ color: "var(--text-muted)" }}>{title}</div>
        {subtitle && <div className="text-[11px]" style={{ color: "var(--text-secondary)" }}>{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

function OverviewContent() {
  const { filters } = useFilters();

  const { data: totals } = useSummaryTotals(filters);
  const { data: categories = [] } = useTopCategories(filters);
  const { data: products = [] } = useTopProducts(filters);
  const { data: timeline = [] } = useReturnsTimeline(filters);
  const { data: outcomes = [] } = useOutcomeDistribution(filters);

  const t = totals ?? {
    total_triggered: 0, full_completion: 0, partial_completion: 0,
    cpnf: 0, not_connected: 0, no_answer_disconnected: 0,
    voicemail: 0, callback_requested: 0, callback_no_time: 0,
    analyzer_issue: 0, out_of_scope: 0, failed_calls: 0,
  };

  const notConnTotal  = t.not_connected + t.no_answer_disconnected + t.voicemail;
  const connectedTotal = t.full_completion + t.partial_completion + t.cpnf;
  const pct = (n: number) => t.total_triggered > 0 ? (n / t.total_triggered * 100).toFixed(1) + "%" : "0%";

  const kpis = [
    { label: "Total Calls",     value: t.total_triggered,   sub: "Triggered in period",          color: "var(--accent-red)" },
    { label: "Full",            value: t.full_completion,   sub: pct(t.full_completion) + " of calls", color: "var(--accent-teal)" },
    { label: "Partial",         value: t.partial_completion, sub: pct(t.partial_completion) + " of calls", color: "#ef9a9a" },
    { label: "No Feedback",     value: t.cpnf,               sub: pct(t.cpnf) + " of calls",     color: "var(--accent-amber)" },
    { label: "Connected",       value: connectedTotal,       sub: pct(connectedTotal) + " of calls", color: "var(--accent-blue)" },
    { label: "Not Connected",   value: t.not_connected,      sub: pct(notConnTotal) + " w/ no answer", color: "var(--accent-gray, #9e9e9e)" },
    { label: "Callback",        value: t.callback_requested + t.callback_no_time, sub: "Mixed outcome", color: "var(--accent-purple)" },
    { label: "Out of Scope",    value: t.out_of_scope,       sub: "Unrelated calls",              color: "var(--accent-pink)" },
  ];

  const donutData = outcomes.map((o) => ({
    name:  o.outcome.replace(/_/g, " ").replace("COMPLETION", "").trim(),
    value: o.cnt,
    color: OUTCOME_COLORS[o.outcome] ?? "#ccc",
  }));

  const catData  = categories.map((c) => ({ name: c.category, count: c.cnt }));
  const prodData = products.map((p) => ({ name: p.product,    count: p.cnt }));
  const timeData = timeline.map((t) => ({ date: t.day, value: t.cnt }));

  const funnelData = [
    { name: "Total",        value: t.total_triggered,   color: "var(--text-primary)" },
    { name: "Connected",    value: connectedTotal,       color: "var(--accent-teal)" },
    { name: "Full",         value: t.full_completion,   color: "#64b5f6" },
    { name: "Partial",      value: t.partial_completion, color: "#ef9a9a" },
    { name: "Not Connected", value: notConnTotal,        color: "#bdbdbd" },
  ];

  return (
    <div className="space-y-4">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
        {kpis.map((k, i) => (
          <motion.div
            key={k.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="tss-card p-4 border-t-4"
            style={{ borderTopColor: k.color }}
          >
            <div className="text-[10px] font-bold tracking-wider" style={{ color: "var(--text-muted)" }}>{k.label}</div>
            <CountUp value={k.value} className="block text-2xl font-extrabold mt-1 tabular-nums" />
            <div className="text-[10px] mt-1" style={{ color: "var(--text-secondary)" }}>{k.sub}</div>
          </motion.div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard title="OUTCOMES" subtitle="Distribution of call outcomes">
          <ZoomableChart baseHeight={280}>
            {(h) => (
              <ResponsiveContainer width="100%" height={h}>
                <PieChart>
                  <Pie data={donutData} dataKey="value" innerRadius={60} outerRadius={100} paddingAngle={1}>
                    {donutData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => v.toLocaleString()} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ZoomableChart>
        </ChartCard>

        <ChartCard title="TOP 10 CATEGORIES" subtitle="By return count">
          <ZoomableChart baseHeight={280}>
            {(h) => (
              <ResponsiveContainer width="100%" height={h}>
                <BarChart data={catData} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <XAxis type="number" tick={{ fontSize: 10, fill: "var(--text-muted)" }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: "var(--text-secondary)" }} width={130} />
                  <Tooltip formatter={(v: number) => v.toLocaleString()} />
                  <Bar dataKey="count" fill="var(--accent-red)" radius={[0, 4, 4, 0]} animationDuration={900} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ZoomableChart>
        </ChartCard>

        <ChartCard title="TOP 10 PRODUCTS" subtitle="By return count">
          <ZoomableChart baseHeight={280}>
            {(h) => (
              <ResponsiveContainer width="100%" height={h}>
                <BarChart data={prodData} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <XAxis type="number" tick={{ fontSize: 10, fill: "var(--text-muted)" }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: "var(--text-secondary)" }} width={150} />
                  <Tooltip formatter={(v: number) => v.toLocaleString()} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} animationDuration={900}>
                    {prodData.map((_, i) => <Cell key={i} fill={i === 0 ? "var(--accent-pink)" : "var(--accent-red)"} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ZoomableChart>
        </ChartCard>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="RETURNS OVER TIME" subtitle="Daily call record count · drag brush to select range">
          <ZoomableChart baseHeight={300}>
            {(h) => (
              <ResponsiveContainer width="100%" height={h}>
                <AreaChart data={timeData} margin={{ bottom: 4 }}>
                  <defs>
                    <linearGradient id="rotg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent-red)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="var(--accent-red)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: "var(--text-muted)" }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} />
                  <Tooltip formatter={(v: number) => v.toLocaleString()} />
                  <Area type="monotone" dataKey="value" stroke="var(--accent-red)" fill="url(#rotg)" strokeWidth={1.5} dot={{ r: 2 }} animationDuration={900} />
                  <Brush
                    dataKey="date"
                    height={22}
                    stroke="var(--accent-red)"
                    fill="var(--bg-card)"
                    travellerWidth={6}
                    tickFormatter={() => ""}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </ZoomableChart>
        </ChartCard>

        <ChartCard title="CALL FUNNEL" subtitle="Triggered → Connected → Full / Partial">
          <ZoomableChart baseHeight={260}>
            {(h) => (
              <ResponsiveContainer width="100%" height={h}>
                <BarChart data={funnelData} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <XAxis type="number" tick={{ fontSize: 10, fill: "var(--text-muted)" }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "var(--text-secondary)" }} width={110} />
                  <Tooltip formatter={(v: number) => v.toLocaleString()} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} animationDuration={900}>
                    {funnelData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ZoomableChart>
        </ChartCard>
      </div>
    </div>
  );
}
