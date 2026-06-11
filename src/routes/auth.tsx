import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { useTheme } from "@/lib/theme/ThemeContext";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const { requestOtp, verifyOtp, cancelOtp, otpPending, user } = useAuth();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();

  const [email, setEmail]     = useState("");
  const [otp, setOtp]         = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [shake, setShake]     = useState(0);

  useEffect(() => {
    if (user) navigate({ to: "/summary", replace: true });
  }, [user, navigate]);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await requestOtp(email);
    setLoading(false);
    if (!res.ok) {
      setError(res.error ?? "Failed to send OTP.");
      setShake((n) => n + 1);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await verifyOtp(otp);
    setLoading(false);
    if (!res.ok) {
      setError(res.error ?? "Invalid OTP.");
      setShake((n) => n + 1);
      setOtp("");
    } else {
      navigate({ to: "/summary" });
    }
  };

  const handleBack = () => {
    cancelOtp();
    setOtp("");
    setError(null);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "var(--bg-page)" }}
    >
      <button
        onClick={toggle}
        title="Toggle dark mode"
        className="fixed top-4 right-4 p-2 rounded-md transition-colors"
        style={{
          border: "1px solid var(--border-color)",
          background: "var(--bg-card)",
          color: "var(--text-secondary)",
        }}
      >
        {theme === "light" ? <Moon size={15} /> : <Sun size={15} />}
      </button>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="tss-card w-full max-w-md p-8 border-l-4"
        style={{ borderColor: "var(--accent-red)" }}
      >
        <div className="flex flex-col items-center gap-2 mb-6">
          <img src="/tss-logo.webp" alt="The Souled Store" className="h-12 w-auto" />
          <div
            className="text-[12px] font-extrabold tracking-widest mt-1"
            style={{ color: "var(--text-muted)" }}
          >
            RETURNS ANALYTICS
          </div>
        </div>

        {!otpPending ? (
          /* ── Step 1: Email ── */
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label
                className="text-[11px] font-bold tracking-wider"
                style={{ color: "var(--text-muted)" }}
              >
                EMAIL
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="tss-input w-full mt-1"
                placeholder="you@thesouledstore.com"
                required
                autoFocus
              />
            </div>

            {error && (
              <motion.div
                key={shake}
                animate={{ x: [0, -8, 8, -6, 6, -3, 3, 0] }}
                transition={{ duration: 0.4 }}
                className="text-[12px] px-3 py-2 rounded-md"
                style={{
                  background: "var(--accent-red-soft)",
                  color: "var(--accent-red)",
                }}
              >
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full text-white font-bold py-2.5 rounded-md text-sm transition-transform active:scale-[0.99] disabled:opacity-60"
              style={{ background: "var(--accent-red)" }}
            >
              {loading ? "Sending…" : "Send OTP"}
            </button>
          </form>
        ) : (
          /* ── Step 2: OTP ── */
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <p
                className="text-[12px] mb-3 leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                An OTP was sent to your Slack DM for{" "}
                <strong>{otpPending.email}</strong>. Enter it below — it expires in 5 minutes.
              </p>
              <label
                className="text-[11px] font-bold tracking-wider"
                style={{ color: "var(--text-muted)" }}
              >
                ONE-TIME PASSWORD
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                className="tss-input w-full mt-1 text-center text-lg font-bold tracking-[0.4em]"
                placeholder="––––––"
                required
                autoFocus
              />
            </div>

            {error && (
              <motion.div
                key={shake}
                animate={{ x: [0, -8, 8, -6, 6, -3, 3, 0] }}
                transition={{ duration: 0.4 }}
                className="text-[12px] px-3 py-2 rounded-md"
                style={{
                  background: "var(--accent-red-soft)",
                  color: "var(--accent-red)",
                }}
              >
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading || otp.length < 4}
              className="w-full text-white font-bold py-2.5 rounded-md text-sm transition-transform active:scale-[0.99] disabled:opacity-60"
              style={{ background: "var(--accent-red)" }}
            >
              {loading ? "Verifying…" : "Verify OTP"}
            </button>

            <button
              type="button"
              onClick={handleBack}
              className="w-full text-[11px] py-1 transition-opacity hover:opacity-70"
              style={{ color: "var(--text-muted)" }}
            >
              ← Use a different email
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
