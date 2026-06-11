import { supabase } from "@/lib/supabase";
import type { Filters } from "@/lib/filters/FilterContext";
import { resolveOutcomes } from "@/lib/filters/FilterContext";
import type { CallRecord } from "@/hooks/useDashboardData";

function esc(v: unknown) {
  return `"${String(v ?? "").replace(/"/g, '""')}"`;
}

function triggerDownload(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Fetch every matching record (no pagination) and download as CSV. */
export async function exportRawCsv(filters: Filters, search?: string): Promise<void> {
  const outcomes = resolveOutcomes(filters.outcomes);
  const { data, error } = await supabase.rpc("get_call_records", {
    from_date:   filters.dateFrom,
    to_date:     filters.dateTo,
    search_term: search || null,
    row_limit:   100_000,
    row_offset:  0,
    outcomes,
  });
  if (error) throw error;

  const records = (data ?? []) as CallRecord[];
  if (!records.length) return;

  const headers = ["Date", "Outcome", "Product", "Size", "Size Group", "Refund Mode", "Resolution", "L1 Reason", "L2 Area", "L3 Detail"];
  const rows = records.map((r) =>
    [
      r.day,
      r.call_outcome,
      r.product_name ?? "",
      r.size ?? "",
      r.size_group ?? "",
      r.refund_mode ?? "",
      r.resolution ?? "",
      r.cat_l1 ?? "",
      r.cat_l2 ?? "",
      r.cat_l3 ?? "",
    ].map(esc).join(",")
  );

  const suffix = search ? `_${search.replace(/\s+/g, "_").toLowerCase()}` : "";
  triggerDownload(
    [headers.join(","), ...rows].join("\n"),
    `tss_records_${filters.dateFrom}_${filters.dateTo}${suffix}.csv`,
  );
}

/** Download an arbitrary array of objects as CSV given an explicit column list. */
export function exportTableCsv(
  rows: Record<string, unknown>[],
  columns: string[],
  filename: string,
) {
  if (!rows.length) return;
  const csvRows = rows.map((r) => columns.map((c) => esc(r[c])).join(","));
  triggerDownload([columns.join(","), ...csvRows].join("\n"), filename);
}
