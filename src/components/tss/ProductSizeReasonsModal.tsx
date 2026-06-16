import { useMemo } from "react";
import { Info } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useFilters } from "@/lib/filters/FilterContext";
import {
  useProductReasonMonthly, type HeatmapPoint,
} from "@/hooks/useDashboardData";
import { normalizeProductName } from "@/lib/utils";

export function ProductSizeReasonsModal({
  product, size, color, heatmapRaw, onClose,
}: {
  product: string | null;
  size: string | null;
  color: string;
  heatmapRaw: HeatmapPoint[];
  onClose: () => void;
}) {
  const { filters } = useFilters();
  const open = !!product && !!size;

  // The exact product_name(s) in the DB that map to (normalized product, clicked size)
  const variantNames = useMemo(() => {
    if (!product || !size) return new Set<string>();
    const s = new Set<string>();
    for (const h of heatmapRaw) {
      if (normalizeProductName(h.product) === product && h.sz === size) s.add(h.product);
    }
    return s;
  }, [heatmapRaw, product, size]);

  const { data: prMonthly = [], isLoading } = useProductReasonMonthly(filters, product ?? "");

  const rows = useMemo(() => {
    const map = new Map<string, { l1: string | null; l2: string | null; l3: string | null; cnt: number }>();
    for (const r of prMonthly) {
      if (!r.product_name || !variantNames.has(r.product_name)) continue;
      const key = `${r.cat_l1 ?? ""}|${r.cat_l2 ?? ""}|${r.cat_l3 ?? ""}`;
      const cur = map.get(key);
      if (cur) cur.cnt += r.cnt;
      else map.set(key, { l1: r.cat_l1, l2: r.cat_l2, l3: r.cat_l3, cnt: r.cnt });
    }
    return Array.from(map.values()).sort((a, b) => b.cnt - a.cnt);
  }, [prMonthly, variantNames]);

  const total = rows.reduce((s, r) => s + r.cnt, 0);
  const max = rows[0]?.cnt ?? 0;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        {open && (
          <>
            <DialogHeader>
              <DialogTitle className="text-base">
                {product} — Size {size}
              </DialogTitle>
            </DialogHeader>

            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span
                className="inline-flex items-center px-3 py-1 rounded-full text-[12px] font-bold tabular-nums"
                style={{ background: "var(--bg-app)", color: "var(--text-primary)" }}
              >
                {total.toLocaleString()} returns
              </span>
            </div>

            <div
              className="rounded-md p-3 text-[12px] mt-3 border-l-4 flex items-start gap-2"
              style={{ background: "var(--bg-app)", borderColor: color }}
            >
              <Info size={14} className="mt-0.5 shrink-0" style={{ color }} />
              <div>
                <span className="font-bold">How % is calculated: </span>
                For this size of the product, % = number of returns with that reason ÷ total returns for the {size} size.
              </div>
            </div>

            <div
              className="mt-3 rounded-md overflow-hidden border"
              style={{ borderColor: "var(--border-color)" }}
            >
              <div
                className="flex items-center justify-between px-3 py-2"
                style={{ background: "var(--table-stripe)" }}
              >
                <div
                  className="inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-full text-[11px] font-bold"
                  style={{ background: "var(--bg-card)", color, border: `1px solid ${color}` }}
                >
                  {size}
                </div>
                <div className="text-[11px] font-bold tabular-nums">
                  {total.toLocaleString()} returns
                </div>
              </div>

              {isLoading && (
                <div className="text-[12px] py-6 text-center" style={{ color: "var(--text-muted)" }}>
                  Loading…
                </div>
              )}
              {!isLoading && rows.length === 0 && (
                <div className="text-[12px] py-6 text-center" style={{ color: "var(--text-muted)" }}>
                  No categorised reasons for this size
                </div>
              )}
              {!isLoading && rows.length > 0 && (
                <div>
                  {rows.map((r, i) => {
                    const path = [r.l1, r.l2, r.l3].filter(Boolean).join(" → ") || "Unclassified";
                    const pct = total > 0 ? Math.round((r.cnt / total) * 100) : 0;
                    const barWidth = max > 0 ? (r.cnt / max) * 100 : 0;
                    return (
                      <div
                        key={path + i}
                        className="flex items-center px-3 py-2 gap-3 border-t"
                        style={{ borderColor: "var(--border-color)" }}
                      >
                        <div className="flex-1 text-[12px] min-w-0 truncate" title={path}>
                          {path}
                        </div>
                        <div className="w-[120px] h-1.5 rounded shrink-0" style={{ background: "var(--border-color)" }}>
                          <div className="h-full rounded" style={{ width: `${barWidth}%`, background: color }} />
                        </div>
                        <div className="w-[42px] text-right text-[12px] font-bold tabular-nums shrink-0">
                          {r.cnt}
                        </div>
                        <div className="w-[40px] text-right text-[11px] tabular-nums shrink-0" style={{ color: "var(--text-muted)" }}>
                          {pct}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
