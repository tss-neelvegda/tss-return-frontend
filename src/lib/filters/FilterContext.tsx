import {
  createContext, useCallback, useContext, useEffect,
  useMemo, useState, type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

// Outcome button labels (TopNav) → DB call_outcome values
export const OUTCOME_MAP: Record<string, string[]> = {
  FULL:            ["FULL_COMPLETION"],
  PARTIAL:         ["PARTIAL_COMPLETION"],
  "NO FEEDBACK":   ["CUSTOMER_PREFERENCE_NO_FEEDBACK"],
  MIXED:           ["CALLBACK_REQUESTED", "CALLBACK_REQUESTED_NO_TIME", "OUT_OF_SCOPE", "CALL_ANALYZER_ISSUE"],
  "NOT CONNECTED": ["NOT_CONNECTED", "NO_ANSWER_DISCONNECTED", "VOICEMAIL_DETECTED"],
};

/** Returns the flat list of DB outcome strings for the given selection, or null for ALL. */
export function resolveOutcomes(outcomes: string[]): string[] | null {
  if (outcomes.includes("ALL") || outcomes.length === 0) return null;
  return outcomes.flatMap((o) => OUTCOME_MAP[o] ?? []);
}

export interface Filters {
  dateFrom: string;
  dateTo:   string;
  outcomes: string[];  // e.g. ["ALL"] | ["FULL","PARTIAL"]
  catL1:    string | null;
  size:     string | null;
  product:  string | null;
}

interface FilterCtx {
  filters: Filters;
  setFilters: (patch: Partial<Filters>) => void;
  resetFilters: () => void;
  minDate: string;
  maxDate: string;
  isLoadingRange: boolean;
}

const DEFAULT_FILTERS: Filters = {
  dateFrom: "2025-12-18",
  dateTo:   "2026-06-30",
  outcomes: ["ALL"],
  catL1:    null,
  size:     null,
  product:  null,
};

const Ctx = createContext<FilterCtx | null>(null);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filters, setFiltersState] = useState<Filters>(DEFAULT_FILTERS);

  // Fetch actual date range from DB so presets are accurate
  const { data: rangeData, isLoading: isLoadingRange } = useQuery({
    queryKey: ["dateRange"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_date_range");
      if (error || !data?.[0]) return null;
      return data[0] as { min_date: string; max_date: string };
    },
    staleTime: Infinity,
  });

  // Once we know the real range, update dateFrom/dateTo defaults
  useEffect(() => {
    if (rangeData) {
      setFiltersState((prev) => ({
        ...prev,
        dateFrom: rangeData.min_date,
        dateTo:   rangeData.max_date,
      }));
    }
  }, [rangeData]);

  const setFilters = useCallback((patch: Partial<Filters>) => {
    setFiltersState((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState({
      ...DEFAULT_FILTERS,
      dateFrom: rangeData?.min_date ?? DEFAULT_FILTERS.dateFrom,
      dateTo:   rangeData?.max_date ?? DEFAULT_FILTERS.dateTo,
    });
  }, [rangeData]);

  const value = useMemo<FilterCtx>(() => ({
    filters,
    setFilters,
    resetFilters,
    minDate: rangeData?.min_date ?? DEFAULT_FILTERS.dateFrom,
    maxDate: rangeData?.max_date ?? DEFAULT_FILTERS.dateTo,
    isLoadingRange,
  }), [filters, setFilters, resetFilters, rangeData, isLoadingRange]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFilters() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useFilters must be used within FilterProvider");
  return ctx;
}
