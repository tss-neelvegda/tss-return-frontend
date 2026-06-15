import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Filters } from "@/lib/filters/FilterContext";
import { resolveOutcomes } from "@/lib/filters/FilterContext";

// ── Types ────────────────────────────────────────────────────

export interface DailySummaryRow {
  date: string;
  total_triggered: number;
  full_completion: number;
  partial_completion: number;
  cpnf: number;
  not_connected: number;
  no_answer_disconnected: number;
  voicemail: number;
  callback_requested: number;
  callback_no_time: number;
  analyzer_issue: number;
  out_of_scope: number;
  failed_calls: number;
}

export interface SummaryTotals {
  total_triggered: number;
  full_completion: number;
  partial_completion: number;
  cpnf: number;
  not_connected: number;
  no_answer_disconnected: number;
  voicemail: number;
  callback_requested: number;
  callback_no_time: number;
  analyzer_issue: number;
  out_of_scope: number;
  failed_calls: number;
}

export interface CategoryCount   { category: string; cnt: number }
export interface ProductCount    { product:  string; cnt: number }
export interface TimelinePoint   { day: string;      cnt: number }
export interface OutcomeCount    { outcome:  string; cnt: number }
export interface ResolutionCount { resolution: string; cnt: number }
export interface ResolutionDailyRow { day: string; return_cnt: number; exchange_cnt: number; cancel_cnt: number }

export interface InsightsSummaryRow {
  size_group: string;
  total: number;
  top_reason: string | null;       top_reason_cnt: number;
  top_size: string | null;         top_size_cnt: number;
  top_product: string | null;      top_product_cnt: number;
  peak_day: string | null;         peak_day_cnt: number;
  daily_avg: number;
}

export interface InsightBreakdownRow { label: string; cnt: number }
export type InsightDimension = "reason" | "size" | "product" | "day";

export interface ProductReasonMonthlyRow {
  product_name: string | null;
  cat_l1: string | null;
  cat_l2: string | null;
  cat_l3: string | null;
  ym: string;
  cnt: number;
}
export interface SizePoint       { sg: string; sz: string; cnt: number }
export interface HeatmapPoint    { product: string; sz: string; cnt: number }
export interface CatCount        { cat: string; cnt: number }

export interface CallRecord {
  id: number;
  day: string;
  call_outcome: string;
  product_name: string | null;
  size: string | null;
  size_group: string | null;
  refund_mode: string | null;
  resolution: string | null;
  cat_l1: string | null;
  cat_l2: string | null;
  cat_l3: string | null;
}

// ── Helpers ──────────────────────────────────────────────────

const n = (v: unknown) => Number(v ?? 0);

// ── Hooks ────────────────────────────────────────────────────

/** All daily_summary rows for the selected date range, sorted newest-first */
export function useDailySummary(filters: Filters) {
  return useQuery({
    queryKey: ["dailySummary", filters.dateFrom, filters.dateTo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_summary")
        .select("*")
        .gte("date", filters.dateFrom)
        .lte("date", filters.dateTo)
        .order("date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DailySummaryRow[];
    },
  });
}

/** Aggregated totals across the selected period */
export function useSummaryTotals(filters: Filters) {
  const outcomes = resolveOutcomes(filters.outcomes);
  return useQuery({
    queryKey: ["summaryTotals", filters.dateFrom, filters.dateTo, filters.outcomes],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_summary_totals", {
        from_date: filters.dateFrom,
        to_date:   filters.dateTo,
        outcomes,
      });
      if (error) throw error;
      const row = data?.[0] ?? {};
      return {
        total_triggered:        n(row.total_triggered),
        full_completion:        n(row.full_completion),
        partial_completion:     n(row.partial_completion),
        cpnf:                   n(row.cpnf),
        not_connected:          n(row.not_connected),
        no_answer_disconnected: n(row.no_answer_disconnected),
        voicemail:              n(row.voicemail),
        callback_requested:     n(row.callback_requested),
        callback_no_time:       n(row.callback_no_time),
        analyzer_issue:         n(row.analyzer_issue),
        out_of_scope:           n(row.out_of_scope),
        failed_calls:           n(row.failed_calls),
      } as SummaryTotals;
    },
  });
}

/** Top N categories by record count */
export function useTopCategories(filters: Filters, limit = 10) {
  const outcomes = resolveOutcomes(filters.outcomes);
  return useQuery({
    queryKey: ["topCategories", filters.dateFrom, filters.dateTo, limit, filters.outcomes],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_top_categories", {
        from_date:  filters.dateFrom,
        to_date:    filters.dateTo,
        row_limit:  limit,
        outcomes,
      });
      if (error) throw error;
      return (data ?? []).map((d: Record<string, unknown>) => ({
        category: String(d.category ?? ""),
        cnt: n(d.cnt),
      })) as CategoryCount[];
    },
  });
}

/** Top N products by record count */
export function useTopProducts(filters: Filters, limit = 10) {
  const outcomes = resolveOutcomes(filters.outcomes);
  return useQuery({
    queryKey: ["topProducts", filters.dateFrom, filters.dateTo, limit, filters.outcomes],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_top_products", {
        from_date:  filters.dateFrom,
        to_date:    filters.dateTo,
        row_limit:  limit,
        outcomes,
      });
      if (error) throw error;
      return (data ?? []).map((d: Record<string, unknown>) => ({
        product: String(d.product ?? ""),
        cnt: n(d.cnt),
      })) as ProductCount[];
    },
  });
}

/** Daily record counts for the timeline chart */
export function useReturnsTimeline(filters: Filters) {
  const outcomes = resolveOutcomes(filters.outcomes);
  return useQuery({
    queryKey: ["returnsTimeline", filters.dateFrom, filters.dateTo, filters.outcomes],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_returns_timeline", {
        from_date: filters.dateFrom,
        to_date:   filters.dateTo,
        outcomes,
      });
      if (error) throw error;
      return (data ?? []).map((d: Record<string, unknown>) => ({
        day: String(d.day ?? ""),
        cnt: n(d.cnt),
      })) as TimelinePoint[];
    },
  });
}

/** Outcome distribution for donut chart */
export function useOutcomeDistribution(filters: Filters) {
  const outcomes = resolveOutcomes(filters.outcomes);
  return useQuery({
    queryKey: ["outcomeDist", filters.dateFrom, filters.dateTo, filters.outcomes],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_outcome_distribution", {
        from_date: filters.dateFrom,
        to_date:   filters.dateTo,
        outcomes,
      });
      if (error) throw error;
      return (data ?? []).map((d: Record<string, unknown>) => ({
        outcome: String(d.outcome ?? ""),
        cnt: n(d.cnt),
      })) as OutcomeCount[];
    },
  });
}

/** Resolution distribution (RETURN / EXCHANGE / CANCEL) */
export function useResolutionDistribution(filters: Filters) {
  const outcomes = resolveOutcomes(filters.outcomes);
  return useQuery({
    queryKey: ["resolutionDist", filters.dateFrom, filters.dateTo, filters.outcomes],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_resolution_distribution", {
        from_date: filters.dateFrom,
        to_date:   filters.dateTo,
        outcomes,
      });
      if (error) throw error;
      return (data ?? []).map((d: Record<string, unknown>) => ({
        resolution: String(d.resolution ?? ""),
        cnt: n(d.cnt),
      })) as ResolutionCount[];
    },
  });
}

/** Per-size-group insight cards (top reason / size / product / peak day) */
export function useInsightsSummary(filters: Filters) {
  const outcomes = resolveOutcomes(filters.outcomes);
  return useQuery({
    queryKey: ["insightsSummary", filters.dateFrom, filters.dateTo, filters.outcomes],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_insights_summary", {
        from_date: filters.dateFrom,
        to_date:   filters.dateTo,
        outcomes,
      });
      if (error) throw error;
      return (data ?? []).map((d: Record<string, unknown>) => ({
        size_group:       String(d.size_group ?? ""),
        total:            n(d.total),
        top_reason:       (d.top_reason as string | null) ?? null,
        top_reason_cnt:   n(d.top_reason_cnt),
        top_size:         (d.top_size as string | null) ?? null,
        top_size_cnt:     n(d.top_size_cnt),
        top_product:      (d.top_product as string | null) ?? null,
        top_product_cnt:  n(d.top_product_cnt),
        peak_day:         (d.peak_day as string | null) ?? null,
        peak_day_cnt:     n(d.peak_day_cnt),
        daily_avg:        n(d.daily_avg),
      })) as InsightsSummaryRow[];
    },
  });
}

/** Full ranked breakdown for one (size_group, dimension) — used by the insight modal */
export function useInsightBreakdown(
  filters: Filters,
  sg: string | null,
  dimension: InsightDimension | null,
) {
  const outcomes = resolveOutcomes(filters.outcomes);
  return useQuery({
    queryKey: ["insightBreakdown", filters.dateFrom, filters.dateTo, sg, dimension, filters.outcomes],
    enabled: !!sg && !!dimension,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_insight_breakdown", {
        from_date: filters.dateFrom,
        to_date:   filters.dateTo,
        sg:        sg!,
        dimension: dimension!,
        outcomes,
      });
      if (error) throw error;
      return (data ?? []).map((d: Record<string, unknown>) => ({
        label: String(d.label ?? ""),
        cnt:   n(d.cnt),
      })) as InsightBreakdownRow[];
    },
  });
}

/** Daily resolution counts (per-day RETURN / EXCHANGE / CANCEL) */
export function useResolutionDaily(filters: Filters) {
  const outcomes = resolveOutcomes(filters.outcomes);
  return useQuery({
    queryKey: ["resolutionDaily", filters.dateFrom, filters.dateTo, filters.outcomes],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_resolution_daily", {
        from_date: filters.dateFrom,
        to_date:   filters.dateTo,
        outcomes,
      });
      if (error) throw error;
      return (data ?? []).map((d: Record<string, unknown>) => ({
        day:          String(d.day ?? ""),
        return_cnt:   n(d.return_cnt),
        exchange_cnt: n(d.exchange_cnt),
        cancel_cnt:   n(d.cancel_cnt),
      })) as ResolutionDailyRow[];
    },
  });
}

/** Size distribution across all groups */
export function useSizeDistribution(filters: Filters) {
  const outcomes = resolveOutcomes(filters.outcomes);
  return useQuery({
    queryKey: ["sizeDist", filters.dateFrom, filters.dateTo, filters.outcomes],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_size_distribution", {
        from_date: filters.dateFrom,
        to_date:   filters.dateTo,
        outcomes,
      });
      if (error) throw error;
      return (data ?? []).map((d: Record<string, unknown>) => ({
        sg:  String(d.sg  ?? ""),
        sz:  String(d.sz  ?? ""),
        cnt: n(d.cnt),
      })) as SizePoint[];
    },
  });
}

/** Product × size heatmap (optionally filtered by size group) */
export function useProductSizeHeatmap(filters: Filters, sizeGroup: string | null) {
  const outcomes = resolveOutcomes(filters.outcomes);
  return useQuery({
    queryKey: ["heatmap", filters.dateFrom, filters.dateTo, sizeGroup, filters.outcomes],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_product_size_heatmap", {
        from_date: filters.dateFrom,
        to_date:   filters.dateTo,
        sg:        sizeGroup,
        outcomes,
      });
      if (error) throw error;
      return (data ?? []).map((d: Record<string, unknown>) => ({
        product: String(d.product ?? ""),
        sz:      String(d.sz      ?? ""),
        cnt:     n(d.cnt),
      })) as HeatmapPoint[];
    },
  });
}

/** Root cause L1 (cat_l1), optionally scoped to a size_group */
export function useRootCauseL1(filters: Filters, sg: string | null = null) {
  const outcomes = resolveOutcomes(filters.outcomes);
  return useQuery({
    queryKey: ["rcL1", filters.dateFrom, filters.dateTo, sg, filters.outcomes],
    enabled: sg !== undefined,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_root_cause_l1", {
        from_date: filters.dateFrom,
        to_date:   filters.dateTo,
        outcomes,
        sg,
      });
      if (error) throw error;
      return (data ?? []).map((d: Record<string, unknown>) => ({
        cat: String(d.cat ?? ""),
        cnt: n(d.cnt),
      })) as CatCount[];
    },
  });
}

/** Root cause L2 counts, filtered by L1 and optionally by size_group */
export function useRootCauseL2(filters: Filters, l1: string | null, sg: string | null = null) {
  const outcomes = resolveOutcomes(filters.outcomes);
  return useQuery({
    queryKey: ["rcL2", filters.dateFrom, filters.dateTo, l1, sg, filters.outcomes],
    enabled: !!l1,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_root_cause_l2", {
        from_date: filters.dateFrom,
        to_date:   filters.dateTo,
        l1:        l1!,
        outcomes,
        sg,
      });
      if (error) throw error;
      return (data ?? []).map((d: Record<string, unknown>) => ({
        cat: String(d.cat ?? ""),
        cnt: n(d.cnt),
      })) as CatCount[];
    },
  });
}

/** Root cause L3 counts, filtered by L2 and optionally by size_group */
export function useRootCauseL3(filters: Filters, l2: string | null, sg: string | null = null) {
  const outcomes = resolveOutcomes(filters.outcomes);
  return useQuery({
    queryKey: ["rcL3", filters.dateFrom, filters.dateTo, l2, sg, filters.outcomes],
    enabled: !!l2,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_root_cause_l3", {
        from_date: filters.dateFrom,
        to_date:   filters.dateTo,
        l2:        l2!,
        outcomes,
        sg,
      });
      if (error) throw error;
      return (data ?? []).map((d: Record<string, unknown>) => ({
        cat: String(d.cat ?? ""),
        cnt: n(d.cnt),
      })) as CatCount[];
    },
  });
}

/** All-records pivot: counts by (product, cat_l1, cat_l2, cat_l3, year-month) */
export function useProductReasonMonthly(filters: Filters, search: string) {
  const outcomes = resolveOutcomes(filters.outcomes);
  return useQuery({
    queryKey: ["productReasonMonthly", filters.dateFrom, filters.dateTo, search, filters.outcomes],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_product_reason_monthly", {
        from_date:   filters.dateFrom,
        to_date:     filters.dateTo,
        search_term: search || null,
        outcomes,
      });
      if (error) throw error;
      return (data ?? []).map((d: Record<string, unknown>) => ({
        product_name: (d.product_name as string | null) ?? null,
        cat_l1:       (d.cat_l1 as string | null) ?? null,
        cat_l2:       (d.cat_l2 as string | null) ?? null,
        cat_l3:       (d.cat_l3 as string | null) ?? null,
        ym:           String(d.ym ?? ""),
        cnt:          n(d.cnt),
      })) as ProductReasonMonthlyRow[];
    },
  });
}

/** Paginated call records */
export function useCallRecords(
  filters: Filters,
  page: number,
  pageSize: number,
  search: string,
) {
  const outcomes = resolveOutcomes(filters.outcomes);
  return useQuery({
    queryKey: ["callRecords", filters.dateFrom, filters.dateTo, page, pageSize, search, filters.outcomes],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_call_records", {
        from_date:   filters.dateFrom,
        to_date:     filters.dateTo,
        search_term: search || null,
        row_limit:   pageSize,
        row_offset:  (page - 1) * pageSize,
        outcomes,
      });
      if (error) throw error;
      return (data ?? []) as CallRecord[];
    },
  });
}

/** Total call record count (for pagination) */
export function useCallRecordCount(filters: Filters, search: string) {
  const outcomes = resolveOutcomes(filters.outcomes);
  return useQuery({
    queryKey: ["callRecordCount", filters.dateFrom, filters.dateTo, search, filters.outcomes],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("count_call_records", {
        from_date:   filters.dateFrom,
        to_date:     filters.dateTo,
        search_term: search || null,
        outcomes,
      });
      if (error) throw error;
      return n(data);
    },
  });
}
