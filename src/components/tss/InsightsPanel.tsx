import { useState } from "react";
import {
  Backpack, CalendarDays, Footprints, Package,
  Repeat, Ruler, Shirt,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useFilters } from "@/lib/filters/FilterContext";
import {
  useInsightBreakdown, useInsightsSummary,
  type InsightDimension, type InsightsSummaryRow,
} from "@/hooks/useDashboardData";

type SizeGroupKey = "APPAREL" | "BOTTOMWEAR" | "FOOTWEAR" | "ACCESSORIES";

const SIZE_GROUPS: { key: SizeGroupKey; label: string; color: string; icon: typeof Shirt }[] = [
  { key: "APPAREL",     label: "Apparel",     color: "var(--accent-red)",    icon: Shirt },
  { key: "BOTTOMWEAR",  label: "Bottomwear",  color: "var(--accent-blue)",   icon: Ruler },
  { key: "FOOTWEAR",    label: "Footwear",    color: "var(--accent-purple)", icon: Footprints },
  { key: "ACCESSORIES", label: "Accessories", color: "var(--accent-teal)",   icon: Backpack },
];

const DIMENSIONS: { key: InsightDimension; label: string; icon: typeof Repeat }[] = [
  { key: "reason",  label: "Top Return Reason",  icon: Repeat },
  { key: "size",    label: "Top Return Size",    icon: Ruler },
  { key: "product", label: "Top Return Product", icon: Package },
  { key: "day",     label: "Peak Return Day",    icon: CalendarDays },
];

function formatDate(d: string | null): string {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  const day = String(dt.getDate()).padStart(2, "0");
  const month = dt.toLocaleString("en-US", { month: "short" });
  const year = String(dt.getFullYear()).slice(-2);
  const weekday = dt.toLocaleString("en-US", { weekday: "short" });
  return `${day}-${month}-${year} (${weekday})`;
}

interface CardSelection {
  sg: SizeGroupKey;
  sgLabel: string;
  sgColor: string;
  dimension: InsightDimension;
  dimensionLabel: string;
}

function Card({
  color,
  label,
  icon: Icon,
  value,
  cnt,
  sub,
  onClick,
}: {
  color: string;
  label: string;
  icon: typeof Repeat;
  value: string;
  cnt: number;
  sub: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="tss-card p-4 text-left border-l-4 transition hover:brightness-110 hover:translate-y-[-1px]"
      style={{ borderLeftColor: color }}
    >
      <div
        className="inline-flex items-center justify-center w-7 h-7 rounded mb-2"
        style={{ background: "var(--bg-app)", color }}
      >
        <Icon size={14} />
      </div>
      <div className="text-[10px] font-bold tracking-wider" style={{ color: "var(--text-muted)" }}>
        {label}
      </div>
      <div className="text-[15px] font-bold mt-1 leading-tight truncate" title={value}>
        {value}
      </div>
      <div className="text-[11px] mt-1 tabular-nums" style={{ color: "var(--text-secondary)" }}>
        {cnt.toLocaleString()} returns
      </div>
      <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>{sub}</div>
    </button>
  );
}

function Row({ row, onPick }: { row: InsightsSummaryRow; onPick: (s: CardSelection) => void }) {
  const sgMeta = SIZE_GROUPS.find((g) => g.key === row.size_group);
  if (!sgMeta) return null;
  const Icon = sgMeta.icon;
  const total = row.total;
  const pct = (n: number) => (total > 0 ? ((n / total) * 100).toFixed(1) : "0.0") + "% of " + sgMeta.label.toLowerCase();

  const peakSub =
    row.daily_avg > 0
      ? `${Math.round(((row.peak_day_cnt - row.daily_avg) / row.daily_avg) * 100)}% above daily avg of ${Math.round(row.daily_avg)}`
      : "";

  const cards = [
    { dim: "reason"  as InsightDimension, label: "TOP RETURN REASON",  icon: Repeat,       value: row.top_reason  ?? "—", cnt: row.top_reason_cnt,  sub: pct(row.top_reason_cnt) },
    { dim: "size"    as InsightDimension, label: "TOP RETURN SIZE",    icon: Ruler,        value: row.top_size    ?? "—", cnt: row.top_size_cnt,    sub: pct(row.top_size_cnt) },
    { dim: "product" as InsightDimension, label: "TOP RETURN PRODUCT", icon: Package,      value: row.top_product ?? "—", cnt: row.top_product_cnt, sub: pct(row.top_product_cnt) },
    { dim: "day"     as InsightDimension, label: "PEAK RETURN DAY",    icon: CalendarDays, value: formatDate(row.peak_day), cnt: row.peak_day_cnt, sub: peakSub },
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-[12px] font-bold tracking-wider">
        <Icon size={14} style={{ color: sgMeta.color }} />
        <span>{sgMeta.label.toUpperCase()}</span>
        <span className="text-[11px] font-normal tabular-nums" style={{ color: "var(--text-secondary)" }}>
          {total.toLocaleString()} returns
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {cards.map((c) => (
          <Card
            key={c.dim}
            color={sgMeta.color}
            label={c.label}
            icon={c.icon}
            value={c.value}
            cnt={c.cnt}
            sub={c.sub}
            onClick={() => onPick({
              sg: row.size_group as SizeGroupKey,
              sgLabel: sgMeta.label,
              sgColor: sgMeta.color,
              dimension: c.dim,
              dimensionLabel: DIMENSIONS.find((d) => d.key === c.dim)!.label,
            })}
          />
        ))}
      </div>
    </div>
  );
}

function BreakdownModal({
  selection,
  onClose,
}: { selection: CardSelection | null; onClose: () => void }) {
  const { filters } = useFilters();
  const { data: rows = [], isLoading } = useInsightBreakdown(
    filters,
    selection?.sg ?? null,
    selection?.dimension ?? null,
  );
  const total = rows.reduce((s, r) => s + r.cnt, 0);
  const max = rows[0]?.cnt ?? 0;
  const DimIcon = selection ? DIMENSIONS.find((d) => d.key === selection.dimension)!.icon : Repeat;
  const headerLabel = selection
    ? selection.dimension === "day"
      ? "Date"
      : selection.dimension === "size"
        ? "Size"
        : selection.dimension === "product"
          ? "Product"
          : "Return Reason"
    : "";

  return (
    <Dialog open={!!selection} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        {selection && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <DimIcon size={16} style={{ color: selection.sgColor }} />
                {selection.sgLabel} — {selection.dimensionLabel}
              </DialogTitle>
            </DialogHeader>
            <div className="mt-2">
              {isLoading && (
                <div className="text-[12px] py-6 text-center" style={{ color: "var(--text-muted)" }}>Loading…</div>
              )}
              {!isLoading && rows.length === 0 && (
                <div className="text-[12px] py-6 text-center" style={{ color: "var(--text-muted)" }}>No data</div>
              )}
              {!isLoading && rows.length > 0 && (
                <table className="w-full text-[12px]">
                  <thead>
                    <tr style={{ background: "var(--table-stripe)" }}>
                      <th className="px-3 py-2 text-left text-[10px] font-bold tracking-wider" style={{ color: "var(--text-muted)" }}>
                        {headerLabel.toUpperCase()}
                      </th>
                      <th className="px-3 py-2 text-right text-[10px] font-bold tracking-wider w-[40%]" style={{ color: "var(--text-muted)" }}>
                        RETURNS
                      </th>
                      <th className="px-3 py-2 text-right text-[10px] font-bold tracking-wider" style={{ color: "var(--text-muted)" }}>
                        %
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => {
                      const label = selection.dimension === "day" ? formatDate(r.label) : r.label;
                      const pct = total > 0 ? ((r.cnt / total) * 100).toFixed(1) : "0.0";
                      const barWidth = max > 0 ? (r.cnt / max) * 100 : 0;
                      return (
                        <tr key={r.label + i} style={{ background: i % 2 ? "var(--table-stripe)" : "transparent" }}>
                          <td className="px-3 py-2 font-medium whitespace-nowrap">{label}</td>
                          <td className="px-3 py-2">
                            <div className="flex items-center justify-end gap-2">
                              <div className="h-2 rounded flex-1" style={{ background: "var(--border-color)", maxWidth: 200 }}>
                                <div className="h-full rounded" style={{ width: `${barWidth}%`, background: selection.sgColor }} />
                              </div>
                              <span className="tabular-nums font-bold w-[60px] text-right">{r.cnt.toLocaleString()}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums" style={{ color: "var(--text-secondary)" }}>{pct}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function InsightsPanel() {
  const { filters } = useFilters();
  const { data: rows = [], isLoading } = useInsightsSummary(filters);
  const [selection, setSelection] = useState<CardSelection | null>(null);

  const orderedRows = SIZE_GROUPS
    .map((g) => rows.find((r) => r.size_group === g.key))
    .filter((r): r is InsightsSummaryRow => !!r);

  return (
    <div className="tss-card p-5 space-y-5">
      <div className="text-[11px] font-bold tracking-wider" style={{ color: "var(--text-muted)" }}>
        INSIGHTS
      </div>
      {isLoading && (
        <div className="text-[12px]" style={{ color: "var(--text-muted)" }}>Loading…</div>
      )}
      {!isLoading && orderedRows.length === 0 && (
        <div className="text-[12px]" style={{ color: "var(--text-muted)" }}>No data for selected range</div>
      )}
      {orderedRows.map((row) => (
        <Row key={row.size_group} row={row} onPick={setSelection} />
      ))}
      <BreakdownModal selection={selection} onClose={() => setSelection(null)} />
    </div>
  );
}
