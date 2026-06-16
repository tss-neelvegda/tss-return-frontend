import { useMemo, useState } from "react";
import {
  CalendarDays, Layers, Package, Repeat, Ruler, X,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useFilters } from "@/lib/filters/FilterContext";
import {
  useProductReasonMonthly, type HeatmapPoint,
} from "@/hooks/useDashboardData";
import { normalizeProductName } from "@/lib/utils";

type ProductDimension = "reason" | "size" | "sub_reason" | "month";

interface PickedDim {
  dim: ProductDimension;
  label: string;
}

interface BreakdownRow { label: string; cnt: number }

function formatMonth(ym: string): string {
  const [y, m] = ym.split("-");
  if (!y || !m) return ym;
  const dt = new Date(Number(y), Number(m) - 1, 1);
  if (isNaN(dt.getTime())) return ym;
  return dt.toLocaleString("en-US", { month: "short", year: "numeric" });
}

function aggregate(
  rows: { cat_l1: string | null; cat_l2: string | null; cat_l3: string | null; ym: string; cnt: number }[],
  key: "cat_l1" | "cat_l2" | "cat_l3" | "ym",
): BreakdownRow[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    const v = r[key];
    if (!v) continue;
    map.set(v, (map.get(v) ?? 0) + r.cnt);
  }
  return Array.from(map.entries())
    .map(([label, cnt]) => ({ label, cnt }))
    .sort((a, b) => b.cnt - a.cnt);
}

function Card({
  color, label, icon: Icon, value, cnt, sub, onClick,
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

function BreakdownModal({
  pick, color, rows, headerLabel, onClose,
}: {
  pick: PickedDim | null;
  color: string;
  rows: BreakdownRow[];
  headerLabel: string;
  onClose: () => void;
}) {
  const total = rows.reduce((s, r) => s + r.cnt, 0);
  const max = rows[0]?.cnt ?? 0;

  return (
    <Dialog open={!!pick} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        {pick && (
          <>
            <DialogHeader>
              <DialogTitle className="text-base">{pick.label}</DialogTitle>
            </DialogHeader>
            <div className="mt-2">
              {rows.length === 0 ? (
                <div className="text-[12px] py-6 text-center" style={{ color: "var(--text-muted)" }}>No data</div>
              ) : (
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
                      const pct = total > 0 ? ((r.cnt / total) * 100).toFixed(1) : "0.0";
                      const barWidth = max > 0 ? (r.cnt / max) * 100 : 0;
                      return (
                        <tr key={r.label + i} style={{ background: i % 2 ? "var(--table-stripe)" : "transparent" }}>
                          <td className="px-3 py-2 font-medium whitespace-nowrap">{r.label}</td>
                          <td className="px-3 py-2">
                            <div className="flex items-center justify-end gap-2">
                              <div className="h-2 rounded flex-1" style={{ background: "var(--border-color)", maxWidth: 200 }}>
                                <div className="h-full rounded" style={{ width: `${barWidth}%`, background: color }} />
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

export function ProductInsightsPanel({
  product, color, heatmapRaw, onClose,
}: {
  product: string;
  color: string;
  heatmapRaw: HeatmapPoint[];
  onClose: () => void;
}) {
  const { filters } = useFilters();
  const { data: prMonthly = [], isLoading } = useProductReasonMonthly(filters, product);
  const [pick, setPick] = useState<PickedDim | null>(null);

  // ILIKE can return other products that contain this name as a substring — keep only rows
  // whose normalized name (variant suffix stripped) equals the clicked product.
  const productRows = useMemo(
    () => prMonthly.filter((r) => normalizeProductName(r.product_name) === product),
    [prMonthly, product],
  );

  const reasons    = useMemo(() => aggregate(productRows, "cat_l1"), [productRows]);
  const subReasons = useMemo(() => aggregate(productRows, "cat_l2"), [productRows]);
  const months     = useMemo(() => aggregate(productRows, "ym"),     [productRows]);

  const sizes = useMemo(() => {
    // Aggregate across all variant rows that map to this normalized product
    const totals = new Map<string, number>();
    for (const h of heatmapRaw) {
      if (normalizeProductName(h.product) !== product) continue;
      totals.set(h.sz, (totals.get(h.sz) ?? 0) + h.cnt);
    }
    return Array.from(totals.entries())
      .map(([label, cnt]) => ({ label, cnt }))
      .sort((a, b) => b.cnt - a.cnt);
  }, [heatmapRaw, product]);

  const monthsFormatted = useMemo(
    () => months.map((m) => ({ label: formatMonth(m.label), cnt: m.cnt })),
    [months],
  );

  const total = sizes.reduce((s, r) => s + r.cnt, 0);
  const pct = (n: number) => (total > 0 ? ((n / total) * 100).toFixed(1) : "0.0") + "% of product";

  const cards: {
    dim: ProductDimension;
    label: string;
    icon: typeof Repeat;
    rows: BreakdownRow[];
    headerLabel: string;
  }[] = [
    { dim: "reason",     label: "TOP RETURN REASON",  icon: Repeat,       rows: reasons,         headerLabel: "Return Reason" },
    { dim: "size",       label: "TOP RETURN SIZE",    icon: Ruler,        rows: sizes,           headerLabel: "Size" },
    { dim: "sub_reason", label: "TOP SUB-REASON",     icon: Layers,       rows: subReasons,      headerLabel: "Sub-reason" },
    { dim: "month",      label: "PEAK RETURN MONTH",  icon: CalendarDays, rows: monthsFormatted, headerLabel: "Month" },
  ];

  const activeCard = pick ? cards.find((c) => c.dim === pick.dim) : null;

  return (
    <div className="tss-card p-5 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[12px] font-bold tracking-wider min-w-0">
          <Package size={14} style={{ color }} />
          <span className="truncate" title={product}>INSIGHTS · {product.toUpperCase()}</span>
          <span className="text-[11px] font-normal tabular-nums shrink-0" style={{ color: "var(--text-secondary)" }}>
            {total.toLocaleString()} returns
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center justify-center w-6 h-6 rounded hover:bg-[var(--table-stripe)]"
          aria-label="Close product insights"
        >
          <X size={14} style={{ color: "var(--text-muted)" }} />
        </button>
      </div>

      {isLoading && (
        <div className="text-[12px]" style={{ color: "var(--text-muted)" }}>Loading…</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {cards.map((c) => {
          const top = c.rows[0];
          return (
            <Card
              key={c.dim}
              color={color}
              label={c.label}
              icon={c.icon}
              value={top?.label ?? "—"}
              cnt={top?.cnt ?? 0}
              sub={top ? pct(top.cnt) : ""}
              onClick={() => setPick({ dim: c.dim, label: `${product} — ${c.label}` })}
            />
          );
        })}
      </div>

      <BreakdownModal
        pick={pick}
        color={color}
        rows={activeCard?.rows ?? []}
        headerLabel={activeCard?.headerLabel ?? ""}
        onClose={() => setPick(null)}
      />
    </div>
  );
}
