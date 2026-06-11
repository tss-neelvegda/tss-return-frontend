import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { Download } from "lucide-react";
import { DashboardShell } from "@/components/tss/DashboardShell";
import { useFilters } from "@/lib/filters/FilterContext";
import { useCallRecords, useCallRecordCount } from "@/hooks/useDashboardData";
import { exportRawCsv } from "@/lib/exportCsv";

export const Route = createFileRoute("/all-records")({
  component: () => (
    <DashboardShell tab="allRecords">
      <AllRecordsContent />
    </DashboardShell>
  ),
});

const PAGE_SIZE = 50;

const OUTCOME_LABEL: Record<string, string> = {
  FULL_COMPLETION:                 "Full",
  PARTIAL_COMPLETION:              "Partial",
  CUSTOMER_PREFERENCE_NO_FEEDBACK: "No Feedback",
  NOT_CONNECTED:                   "Not Connected",
  NO_ANSWER_DISCONNECTED:          "No Answer",
  VOICEMAIL_DETECTED:              "Voicemail",
  CALLBACK_REQUESTED:              "Callback",
  CALLBACK_REQUESTED_NO_TIME:      "Callback (no time)",
  CALL_ANALYZER_ISSUE:             "Analyzer Issue",
  OUT_OF_SCOPE:                    "Out of Scope",
};

const OUTCOME_COLOR: Record<string, string> = {
  FULL_COMPLETION:    "var(--accent-teal)",
  PARTIAL_COMPLETION: "var(--accent-red)",
  NOT_CONNECTED:      "var(--text-muted)",
  NO_ANSWER_DISCONNECTED: "var(--text-muted)",
};

function AllRecordsContent() {
  const { filters } = useFilters();
  const [search, setSearch]           = useState("");
  const [page, setPage]               = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [exporting, setExporting]     = useState(false);

  // Debounce search
  function handleSearch(v: string) {
    setSearch(v);
    clearTimeout((window as { _st?: ReturnType<typeof setTimeout> })._st);
    (window as { _st?: ReturnType<typeof setTimeout> })._st = setTimeout(() => {
      setDebouncedSearch(v);
      setPage(1);
    }, 350);
  }

  const { data: records = [], isLoading } = useCallRecords(filters, page, PAGE_SIZE, debouncedSearch);
  const { data: totalCount = 0 } = useCallRecordCount(filters, debouncedSearch);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  async function downloadCSV() {
    if (exporting) return;
    setExporting(true);
    try {
      await exportRawCsv(filters, debouncedSearch || undefined);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="tss-card p-5">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
        <div className="text-[12px] font-bold tracking-wider">ALL CALL RECORDS</div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
            {totalCount.toLocaleString()} records
          </span>
          <input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="tss-input w-48"
            placeholder="Search product…"
          />
          <button
            onClick={downloadCSV}
            disabled={exporting}
            className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-md text-white disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ background: "var(--accent-red)" }}
          >
            <Download size={11} /> {exporting ? "Exporting…" : "CSV"}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr style={{ background: "var(--table-stripe)" }}>
              {["DATE","OUTCOME","PRODUCT","SIZE","REFUND MODE","RESOLUTION","L1 REASON","L2 AREA","L3 DETAIL"].map((c) => (
                <th key={c} className="px-3 py-2 text-left text-[10px] font-bold tracking-wider whitespace-nowrap" style={{ color: "var(--text-muted)" }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={9} className="px-3 py-8 text-center text-[12px]" style={{ color: "var(--text-muted)" }}>Loading…</td></tr>
            ) : records.length === 0 ? (
              <tr><td colSpan={9} className="px-3 py-8 text-center text-[12px]" style={{ color: "var(--text-muted)" }}>No records found</td></tr>
            ) : records.map((r, i) => (
              <motion.tr
                key={r.id}
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(0.3, i * 0.01) }}
                style={{ background: i % 2 ? "var(--table-stripe)" : "transparent" }}
              >
                <td className="px-3 py-2 whitespace-nowrap">{r.day}</td>
                <td className="px-3 py-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{
                    background: "var(--accent-red-soft)",
                    color: OUTCOME_COLOR[r.call_outcome] ?? "var(--accent-red)",
                  }}>
                    {OUTCOME_LABEL[r.call_outcome] ?? r.call_outcome}
                  </span>
                </td>
                <td className="px-3 py-2 max-w-[200px] truncate" title={r.product_name ?? ""}>{r.product_name ?? "—"}</td>
                <td className="px-3 py-2">{r.size ?? "—"}</td>
                <td className="px-3 py-2">{r.refund_mode?.replace(/_/g, " ") ?? "—"}</td>
                <td className="px-3 py-2">{r.resolution ?? "—"}</td>
                <td className="px-3 py-2 max-w-[140px] truncate" title={r.cat_l1 ?? ""}>{r.cat_l1 ?? "—"}</td>
                <td className="px-3 py-2 max-w-[140px] truncate" title={r.cat_l2 ?? ""}>{r.cat_l2 ?? "—"}</td>
                <td className="px-3 py-2 max-w-[140px] truncate" title={r.cat_l3 ?? ""}>{r.cat_l3 ?? "—"}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-3" style={{ borderTop: "1px solid var(--border-color)" }}>
          <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            Page {page} of {totalPages} · {totalCount.toLocaleString()} total
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="text-[11px] font-bold px-2.5 py-1 rounded-md disabled:opacity-40"
              style={{ border: "1px solid var(--border-color)", color: "var(--text-secondary)" }}
            >
              ← Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="text-[11px] font-bold px-2.5 py-1 rounded-md disabled:opacity-40"
              style={{ border: "1px solid var(--border-color)", color: "var(--text-secondary)" }}
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
