import { useNavigate, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Lock } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { TopNav } from "./TopNav";
import { FilterBar } from "./FilterBar";
import { useAuth, type TabKey } from "@/lib/auth/AuthContext";

const PATH_TO_TAB: Record<string, TabKey> = {
  "/summary":      "summary",
  "/overview":     "overview",
  "/product-size": "productSize",
  "/root-cause":   "rootCause",
  "/all-records":  "allRecords",
  "/admin":        "admin",
};
// suppress unused variable warning
void PATH_TO_TAB;

export function DashboardShell({ children, tab }: { children: ReactNode; tab: TabKey }) {
  const { user, canAccess } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      if (!localStorage.getItem("tss_user")) {
        navigate({ to: "/auth", replace: true });
      } else {
        setAuthChecked(true);
      }
    }, 50);
    return () => clearTimeout(t);
  }, [navigate]);

  if (!user && !authChecked) {
    return <div className="min-h-screen" style={{ background: "var(--bg-page)" }} />;
  }

  const blocked = user && !canAccess(tab);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-page)" }}>
      <TopNav />
      <FilterBar />
      <AnimatePresence mode="wait">
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
          className="px-6 py-6"
        >
          {blocked ? <AccessRestricted /> : children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function AccessRestricted() {
  return (
    <div className="flex items-center justify-center py-32">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ background: "var(--accent-red-soft)", color: "var(--accent-red)" }}>
          <Lock size={28} />
        </div>
        <h2 className="text-xl font-bold mb-2">Access Restricted</h2>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          You don't have permission to view this tab. Ask an admin to enable access.
        </p>
      </div>
    </div>
  );
}
