import { useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { LogOut, Moon, Sun, UploadCloud } from "lucide-react";
import { useAuth, type TabKey } from "@/lib/auth/AuthContext";
import { useTheme } from "@/lib/theme/ThemeContext";
import { useFilters } from "@/lib/filters/FilterContext";
import { UploadModal } from "@/components/tss/UploadModal";

const TABS: { key: TabKey; label: string; to: string }[] = [
  { key: "summary", label: "SUMMARY", to: "/summary" },
  { key: "overview", label: "OVERVIEW", to: "/overview" },
  { key: "productSize", label: "PRODUCT × SIZE", to: "/product-size" },
  { key: "rootCause", label: "ROOT CAUSE", to: "/root-cause" },
  { key: "allRecords", label: "ALL RECORDS", to: "/all-records" },
  { key: "admin", label: "ADMIN", to: "/admin" },
];

const OUTCOME_FILTERS = ["FULL", "PARTIAL", "NO FEEDBACK", "MIXED", "NOT CONNECTED", "ALL"];

export function TopNav() {
  const { user, logout, canAccess } = useAuth();
  const { filters, setFilters, maxDate, isLoadingRange } = useFilters();
  const [uploadOpen, setUploadOpen] = useState(false);
  const outcomes = filters.outcomes;

  function formatMaxDate(iso: string) {
    if (!iso) return "…";
    const [y, m, d] = iso.split("-").map(Number);
    const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
    return `${d} ${months[m - 1]} '${String(y).slice(2)}`;
  }

  function toggleOutcome(label: string) {
    if (label === "ALL") {
      setFilters({ outcomes: ["ALL"] });
      return;
    }
    const without = outcomes.filter((o) => o !== "ALL" && o !== label);
    const isActive = outcomes.includes(label);
    const next = isActive ? without : [...without, label];
    setFilters({ outcomes: next.length === 0 ? ["ALL"] : next });
  }
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div
      className="w-full border-b"
      style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
    >
      {/* top row */}
      <div className="flex items-center justify-between px-6 py-3 border-l-4" style={{ borderColor: "var(--accent-red)" }}>
        <div className="flex items-center gap-3">
          <img src="/tss-logo.webp" alt="The Souled Store" className="h-9 w-auto" />
          <div className="text-[13px] font-extrabold tracking-tight" style={{ color: "var(--text-primary)" }}>
            RETURNS <span style={{ color: "var(--accent-red)" }}>ANALYTICS</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold"
            style={{ background: "rgba(76,175,80,0.12)", color: "var(--accent-green)" }}
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping" style={{ background: "var(--accent-green)" }} />
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: "var(--accent-green)" }} />
            </span>
            {isLoadingRange ? "LOADING…" : `DATA UPDATED TO ${formatMaxDate(maxDate)}`}
          </motion.div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold" style={{ color: "var(--text-muted)" }}>OUTCOMES:</span>
            {OUTCOME_FILTERS.map((f) => {
              const active = f === "ALL" ? outcomes.includes("ALL") : outcomes.includes(f);
              return (
                <button
                  key={f}
                  onClick={() => toggleOutcome(f)}
                  className="text-[10px] font-bold px-2.5 py-1 rounded-md tracking-wide transition-colors"
                  style={{
                    background: active ? "var(--accent-red)" : "transparent",
                    color: active ? "#fff" : "var(--text-secondary)",
                    border: `1px solid ${active ? "var(--accent-red)" : "var(--border-color)"}`,
                  }}
                >
                  {f}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setUploadOpen(true)}
            className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-md transition-colors"
            style={{ background: "var(--accent-red)", color: "#fff", border: "none" }}
            title="Upload returns data"
          >
            <UploadCloud size={13} /> Upload
          </button>

          <button
            onClick={toggle}
            className="p-1.5 rounded-md transition-colors"
            style={{ color: "var(--text-secondary)", border: "1px solid var(--border-color)" }}
            title="Toggle theme"
          >
            {theme === "light" ? <Moon size={14} /> : <Sun size={14} />}
          </button>

          {user && (
            <button
              onClick={() => {
                logout();
                navigate({ to: "/auth" });
              }}
              className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-md"
              style={{ color: "var(--text-secondary)", border: "1px solid var(--border-color)" }}
            >
              <LogOut size={12} /> Logout
            </button>
          )}
        </div>
      </div>

      <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} />

      {/* tabs row */}
      <div className="flex items-center gap-1 px-6">
        {TABS.map((t) => {
          if (t.key === "admin" && user?.role !== "admin") return null;
          const allowed = canAccess(t.key);
          const active = pathname.startsWith(t.to);
          return (
            <Link
              key={t.key}
              to={t.to}
              className="relative px-3 py-3 text-[11px] font-bold tracking-wider transition-colors"
              style={{
                color: active
                  ? "var(--accent-red)"
                  : allowed
                  ? "var(--text-secondary)"
                  : "var(--text-muted)",
                opacity: allowed ? 1 : 0.5,
              }}
            >
              {t.label}
              {active && (
                <motion.div
                  layoutId="active-tab-underline"
                  className="absolute left-0 right-0 bottom-0 h-0.5"
                  style={{ background: "var(--accent-red)" }}
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}