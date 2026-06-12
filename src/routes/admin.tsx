import { createFileRoute } from "@tanstack/react-router";
import { Loader2, ShieldCheck, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/tss/DashboardShell";
import { useAuth, type Role } from "@/lib/auth/AuthContext";

export const Route = createFileRoute("/admin")({
  component: () => (
    <DashboardShell tab="admin">
      <AdminContent />
    </DashboardShell>
  ),
});

const ROLE_LABEL: Record<Role, string> = {
  admin:           "Admin",
  privileged_user: "Member+",
  normal_user:     "Member",
};

const ROLE_STYLE: Record<Role, { bg: string; color: string }> = {
  admin:           { bg: "rgba(139,92,246,0.12)", color: "#7c3aed" },
  privileged_user: { bg: "var(--accent-teal-soft)", color: "var(--accent-teal)" },
  normal_user:     { bg: "var(--accent-red-soft)",  color: "var(--accent-red)" },
};

function AddUserForm({ onAdded }: { onAdded: () => void }) {
  const { createUser } = useAuth();
  const [email, setEmail]     = useState("");
  const [role, setRole]       = useState<Exclude<Role, "admin">>("normal_user");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await createUser(email.trim().toLowerCase(), role);
    setLoading(false);
    if (res.ok) {
      toast.success(`${email} added as ${ROLE_LABEL[role]}. They can now log in via Slack OTP.`);
      setEmail("");
      setRole("normal_user");
      onAdded();
    } else {
      toast.error(res.error ?? "Failed to add user.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1">
        <label className="text-[10px] font-bold tracking-wider block mb-1" style={{ color: "var(--text-muted)" }}>
          EMAIL
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@thesouledstore.com"
          required
          className="tss-input w-full"
        />
      </div>

      <div>
        <label className="text-[10px] font-bold tracking-wider block mb-1" style={{ color: "var(--text-muted)" }}>
          ROLE
        </label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as Exclude<Role, "admin">)}
          className="tss-input"
          style={{ minWidth: 120 }}
        >
          <option value="normal_user">Member</option>
          <option value="privileged_user">Member+</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="flex items-center gap-1.5 text-[12px] font-bold px-4 py-2 rounded-md text-white transition-opacity disabled:opacity-60"
        style={{ background: "var(--accent-red)" }}
      >
        <UserPlus size={13} />
        {loading ? "Adding…" : "Add User"}
      </button>
    </form>
  );
}

function AdminContent() {
  const { user, users, setUserRole, fetchUsers } = useAuth();
  const [loadingUsers, setLoadingUsers]   = useState(true);
  const [updatingEmail, setUpdatingEmail] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers().finally(() => setLoadingUsers(false));
  }, [fetchUsers]);

  if (user?.role !== "admin") {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
            style={{ background: "var(--accent-red-soft)", color: "var(--accent-red)" }}
          >
            <ShieldCheck size={28} />
          </div>
          <h2 className="text-xl font-bold mb-2">Admin Access Required</h2>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Only the admin account can manage users.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* Add User */}
      <div className="tss-card p-5">
        <div className="text-[12px] font-bold tracking-wider mb-1">ADD USER</div>
        <div className="text-[11px] mb-4" style={{ color: "var(--text-muted)" }}>
          Register a new user. They'll receive a Slack OTP the first time they log in.
        </div>
        <AddUserForm onAdded={() => fetchUsers()} />
      </div>

      {/* Users */}
      <div className="tss-card p-5">
        <div className="text-[12px] font-bold tracking-wider mb-1">USERS</div>
        <div className="text-[11px] mb-3" style={{ color: "var(--text-muted)" }}>
          Promote or demote users between Member+ and Member. The admin account cannot be changed.
        </div>

        {loadingUsers ? (
          <div className="flex items-center justify-center py-8 gap-2" style={{ color: "var(--text-muted)" }}>
            <Loader2 size={14} className="animate-spin" />
            <span className="text-[12px]">Loading users…</span>
          </div>
        ) : users.length === 0 ? (
          <p className="text-[12px] py-4 text-center" style={{ color: "var(--text-muted)" }}>
            No users yet — add one above.
          </p>
        ) : (
          <table className="w-full text-[12px]">
            <thead>
              <tr style={{ background: "var(--table-stripe)" }}>
                <th className="px-3 py-2 text-left text-[10px] font-bold tracking-wider" style={{ color: "var(--text-muted)" }}>EMAIL</th>
                <th className="px-3 py-2 text-left text-[10px] font-bold tracking-wider" style={{ color: "var(--text-muted)" }}>ROLE</th>
                <th className="px-3 py-2 text-left text-[10px] font-bold tracking-wider" style={{ color: "var(--text-muted)" }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => {
                const style   = ROLE_STYLE[u.role];
                const isAdmin = u.role === "admin";
                return (
                  <tr key={u.email} style={{ background: i % 2 ? "var(--table-stripe)" : "transparent" }}>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        {isAdmin && <ShieldCheck size={12} style={{ color: "#7c3aed", flexShrink: 0 }} />}
                        {u.email}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: style.bg, color: style.color }}
                      >
                        {ROLE_LABEL[u.role]}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {isAdmin ? (
                        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Protected</span>
                      ) : (
                        <button
                          disabled={updatingEmail === u.email}
                          onClick={async () => {
                            const next = u.role === "privileged_user" ? "normal_user" : "privileged_user";
                            setUpdatingEmail(u.email);
                            const res = await setUserRole(u.email, next);
                            if (res.ok) {
                              toast.success(`${u.email} → ${ROLE_LABEL[next]}`);
                              await fetchUsers();
                            } else {
                              toast.error(res.error ?? "Failed to update user.");
                            }
                            setUpdatingEmail(null);
                          }}
                          className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-md transition-opacity disabled:opacity-60"
                          style={{ border: "1px solid var(--accent-red)", color: "var(--accent-red)" }}
                        >
                          {updatingEmail === u.email && <Loader2 size={11} className="animate-spin" />}
                          {updatingEmail === u.email
                            ? "Updating…"
                            : u.role === "privileged_user" ? "Demote to Member" : "Promote to Member+"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}
