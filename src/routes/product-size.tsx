import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Download } from "lucide-react";
import { DashboardShell } from "@/components/tss/DashboardShell";
import { ProductInsightsPanel } from "@/components/tss/ProductInsightsPanel";
import { ProductSizeReasonsModal } from "@/components/tss/ProductSizeReasonsModal";
import { useFilters } from "@/lib/filters/FilterContext";
import {
  useInsightBreakdown, useProductSizeHeatmap, useSizeDistribution,
} from "@/hooks/useDashboardData";
import { exportTableCsv } from "@/lib/exportCsv";
import { normalizeProductName } from "@/lib/utils";

const GROUP_COLORS: Record<string, string> = {
  APPAREL:     "var(--accent-red)",
  BOTTOMWEAR:  "var(--accent-blue)",
  FOOTWEAR:    "var(--accent-purple)",
  ACCESSORIES: "var(--accent-teal)",
};

export const Route = createFileRoute("/product-size")({
  component: () => (
    <DashboardShell tab="productSize">
      <ProductSizeContent />
    </DashboardShell>
  ),
});

const SIZE_GROUPS = ["APPAREL", "BOTTOMWEAR", "FOOTWEAR", "ACCESSORIES"] as const;
type GroupKey = typeof SIZE_GROUPS[number];

const GROUP_SIZE_ORDER: Record<GroupKey, string[]> = {
  APPAREL:     ["XXS","XS","S","M","L","XL","XXL","XXXL"],
  BOTTOMWEAR:  ["24","26","28","30","32","34","36","38","40"],
  FOOTWEAR:    ["UK 3","UK 4","UK 5","UK 6","UK 7","UK 8","UK 9","UK 10","UK 11","UK 12"],
  ACCESSORIES: ["FREESIZE"],
};

const DONUT_COLORS = [
  "var(--accent-red)",
  "var(--accent-blue)",
  "var(--accent-teal)",
  "var(--accent-amber)",
  "var(--accent-purple)",
  "var(--accent-pink)",
  "#ef9a9a",
  "#64b5f6",
  "#bdbdbd",
  "#90caf9",
];

function heatColor(v: number, max: number) {
  if (!v) return "transparent";
  const p = v / max;
  if (p > 0.8)  return "#c62828";
  if (p > 0.5)  return "#ef5350";
  if (p > 0.3)  return "#ff8a65";
  if (p > 0.15) return "#ffb74d";
  if (p > 0.05) return "#ffe082";
  return "#fff9c4";
}

function ProductSizeContent() {
  const { filters } = useFilters();
  const [group, setGroup] = useState<GroupKey>("APPAREL");
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [sizeCellPick, setSizeCellPick] = useState<{ product: string; size: string } | null>(null);

  const { data: sizeData = [] } = useSizeDistribution(filters);
  const { data: heatmapRaw = [], isLoading: heatLoading } = useProductSizeHeatmap(filters, group);
  const { data: reasonRows = [] } = useInsightBreakdown(filters, group, "reason");

  const reasonChartData = reasonRows
    .slice(0, 10)
    .map((r, i) => ({ name: r.label, value: r.cnt, color: DONUT_COLORS[i % DONUT_COLORS.length] }));

  // Build size group tiles from size distribution
  const groupTotals = useMemo(() => {
    const map: Record<string, { total: number; sizes: [string, number][] }> = {};
    for (const sg of SIZE_GROUPS) map[sg] = { total: 0, sizes: [] };
    for (const row of sizeData) {
      const g = row.sg as GroupKey;
      if (map[g]) {
        map[g].total += row.cnt;
        map[g].sizes.push([row.sz, row.cnt]);
      }
    }
    // Sort sizes by natural order
    for (const [g, data] of Object.entries(map)) {
      const order = GROUP_SIZE_ORDER[g as GroupKey] ?? [];
      data.sizes.sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
    }
    return map;
  }, [sizeData]);

  // Build heatmap: product → size → count
  // Collapse per-size variant rows ("Foo - Variant ( 32 )", "Foo - Variant ( 34 )")
  // into one row per base product, summing counts across all variants.
  const { heatRows, sizeCols } = useMemo(() => {
    const order = GROUP_SIZE_ORDER[group] ?? [];
    const productMap = new Map<string, Record<string, number>>();
    const sizeSet = new Set<string>();

    for (const row of heatmapRaw) {
      const p = normalizeProductName(row.product);
      if (!productMap.has(p)) productMap.set(p, {});
      const sizes = productMap.get(p)!;
      sizes[row.sz] = (sizes[row.sz] ?? 0) + row.cnt;
      sizeSet.add(row.sz);
    }

    const sizeCols = order.filter((s) => sizeSet.has(s));
    const heatRows = Array.from(productMap.entries()).map(([product, sizes]) => ({
      product,
      ...sizes,
      total: Object.values(sizes).reduce((a, b) => a + b, 0),
    })).sort((a, b) => (b.total as number) - (a.total as number));

    return { heatRows, sizeCols };
  }, [heatmapRaw, group]);

  const productCategoryData = SIZE_GROUPS.map((g, i) => ({
    name: g.charAt(0) + g.slice(1).toLowerCase(),
    value: groupTotals[g]?.total ?? 0,
    color: ["var(--accent-red)", "var(--accent-blue)", "var(--accent-purple)", "var(--accent-teal)"][i],
  })).filter((d) => d.value > 0);

  const filtered = heatRows.filter((r) => r.product.toLowerCase().includes(search.toLowerCase()));
  const max = Math.max(...heatRows.flatMap((r) => sizeCols.map((c) => (r[c] as number) || 0)), 1);

  function downloadHeatmapCsv() {
    exportTableCsv(
      filtered.map((r) => ({
        Product: r.product,
        ...Object.fromEntries(sizeCols.map((c) => [c, (r[c] as number) || 0])),
        Total: r.total,
      })),
      ["Product", ...sizeCols, "Total"],
      `tss_product_size_${group.toLowerCase()}_${filters.dateFrom}_${filters.dateTo}.csv`,
    );
  }

  return (
    <div className="space-y-4">
      {/* Size Groups */}
      <div className="tss-card overflow-hidden">
        <div className="px-5 py-3 text-[12px] font-bold tracking-wider text-white" style={{ background: "#1f2937" }}>📐 SIZE GROUPS</div>
        <div className="grid grid-cols-1 md:grid-cols-4">
          {SIZE_GROUPS.map((g) => {
            const data = groupTotals[g] ?? { total: 0, sizes: [] };
            const active = g === group;
            return (
              <button
                key={g}
                onClick={() => { setGroup(g); setSelectedProduct(null); }}
                className="p-4 text-left border-r last:border-r-0 transition-colors"
                style={{ background: active ? "var(--accent-red-soft)" : "transparent", borderColor: "var(--border-color)" }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[12px] font-bold">{g}</div>
                  <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>{data.total.toLocaleString()} records</div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {data.sizes.map(([s, n]) => (
                    <motion.span
                      key={s}
                      whileTap={{ scale: 0.92 }}
                      className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full"
                      style={{ background: active ? "var(--bg-card)" : "var(--accent-red-soft)", color: "var(--accent-red)", border: "1px solid var(--accent-red)" }}
                    >
                      {s} <span style={{ color: "var(--text-secondary)" }}>{n.toLocaleString()}</span>
                    </motion.span>
                  ))}
                  {data.sizes.length === 0 && (
                    <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>No data</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Heatmap */}
      <div className="tss-card p-5">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div>
            <div className="text-[12px] font-bold tracking-wider">PRODUCT × SIZE HEATMAP</div>
            <div className="text-[11px] mt-0.5" style={{ color: "var(--accent-red)" }}>
              Filtered: {group.charAt(0) + group.slice(1).toLowerCase()}
              {heatLoading && " · loading…"}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="tss-input w-56"
              placeholder="Search products…"
            />
            <button
              onClick={downloadHeatmapCsv}
              disabled={heatLoading || !filtered.length}
              className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-md text-white disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: "var(--accent-red)" }}
            >
              <Download size={11} /> CSV
            </button>
          </div>
        </div>

        <div className="text-[11px] mb-2" style={{ color: "var(--text-secondary)" }}>
          Click a product row for its insights below, or click a size cell for the return-reason breakdown of that variant.
        </div>

        <div className="overflow-x-auto overflow-y-auto max-h-[520px]">
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 z-10">
              <tr style={{ background: "var(--table-stripe)" }}>
                <th className="px-3 py-2 text-left text-[10px] font-bold tracking-wider" style={{ color: "var(--text-muted)" }}>PRODUCT</th>
                {sizeCols.map((c) => (
                  <th key={c} className="px-2 py-2 text-center text-[10px] font-bold tracking-wider" style={{ color: "var(--text-muted)" }}>{c}</th>
                ))}
                <th className="px-2 py-2 text-center text-[10px] font-bold tracking-wider" style={{ color: "var(--text-muted)" }}>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filtered.map((row, i) => {
                  const isSelected = selectedProduct === row.product;
                  return (
                    <motion.tr
                      key={row.product + i}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      onClick={() => setSelectedProduct(isSelected ? null : row.product)}
                      className="cursor-pointer transition-colors"
                      style={{ background: isSelected ? "var(--accent-red-soft)" : undefined }}
                      title="Click to view product insights"
                    >
                      <td className="px-3 py-2 font-medium" style={{ color: "var(--accent-red)" }}>
                        {isSelected ? "▸ " : ""}{row.product}
                      </td>
                      {sizeCols.map((c) => {
                        const v = row[c] as number | undefined;
                        return (
                          <td key={c} className="px-1 py-1 text-center">
                            {v ? (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSizeCellPick({ product: row.product, size: c });
                                }}
                                className="inline-flex items-center justify-center min-w-[36px] py-1 rounded font-bold tabular-nums cursor-pointer transition hover:brightness-110 hover:ring-2"
                                style={{ background: heatColor(v, max), color: v / max > 0.5 ? "#fff" : "#5d4037" }}
                                title={`Click to see return reasons for size ${c}`}
                              >
                                {v}
                              </motion.div>
                            ) : <span style={{ color: "var(--text-muted)" }}>—</span>}
                          </td>
                        );
                      })}
                      <td className="px-2 py-1 text-center font-bold tabular-nums">{(row.total as number).toLocaleString()}</td>
                    </motion.tr>
                  );
                })}
                {filtered.length === 0 && !heatLoading && (
                  <tr><td colSpan={sizeCols.length + 2} className="px-3 py-8 text-center text-[12px]" style={{ color: "var(--text-muted)" }}>No data for selected range and group</td></tr>
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      {/* Product-level insights (visible when a product row is clicked) */}
      {selectedProduct && (
        <ProductInsightsPanel
          product={selectedProduct}
          color={GROUP_COLORS[group] ?? "var(--accent-red)"}
          heatmapRaw={heatmapRaw}
          onClose={() => setSelectedProduct(null)}
        />
      )}

      {/* Per-(product, size) return-reasons modal (opens when a size cell is clicked) */}
      <ProductSizeReasonsModal
        product={sizeCellPick?.product ?? null}
        size={sizeCellPick?.size ?? null}
        color={GROUP_COLORS[group] ?? "var(--accent-red)"}
        heatmapRaw={heatmapRaw}
        onClose={() => setSizeCellPick(null)}
      />

      {/* Return Reasons + Product Category */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="tss-card p-5">
          <div className="text-[12px] font-bold tracking-wider mb-1">RETURN REASONS</div>
          <div className="text-[11px] mb-3" style={{ color: "var(--text-secondary)" }}>
            Top reasons in {group.charAt(0) + group.slice(1).toLowerCase()}
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie data={reasonChartData} dataKey="value" nameKey="name" innerRadius="42%" outerRadius="72%" paddingAngle={1}>
                {reasonChartData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip formatter={(v: number) => v.toLocaleString()} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
          {reasonChartData.length === 0 && (
            <div className="text-[12px] py-6 text-center" style={{ color: "var(--text-muted)" }}>No data</div>
          )}
        </div>

        <div className="tss-card p-5">
          <div className="text-[12px] font-bold tracking-wider mb-1">PRODUCT CATEGORY</div>
          <div className="text-[11px] mb-3" style={{ color: "var(--text-secondary)" }}>Returns by size group</div>
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie data={productCategoryData} dataKey="value" nameKey="name" innerRadius="42%" outerRadius="72%" paddingAngle={1}>
                {productCategoryData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip formatter={(v: number) => v.toLocaleString()} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
          {productCategoryData.length === 0 && (
            <div className="text-[12px] py-6 text-center" style={{ color: "var(--text-muted)" }}>No data</div>
          )}
        </div>
      </div>
    </div>
  );
}
