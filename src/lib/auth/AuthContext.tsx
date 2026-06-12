import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Role = "admin" | "privileged_user" | "normal_user";
type ApiRole = "ref_admin" | "ref_memberplus" | "ref_member";

export type TabKey =
  | "summary"
  | "overview"
  | "productSize"
  | "rootCause"
  | "allRecords"
  | "admin";

export interface KnownUser {
  email: string;
  role: Role;
  name?: string;
}

export interface OtpState {
  email: string;
  role: ApiRole;
}

interface SessionUser {
  email: string;
  role: Role;
}

interface AuthCtx {
  user: SessionUser | null;
  users: KnownUser[];
  otpPending: OtpState | null;
  requestOtp: (email: string) => Promise<{ ok: boolean; error?: string }>;
  verifyOtp: (otp: string) => Promise<{ ok: boolean; error?: string }>;
  cancelOtp: () => void;
  logout: () => void;
  fetchUsers: () => Promise<void>;
  createUser: (email: string, role: Exclude<Role, "admin">) => Promise<{ ok: boolean; error?: string }>;
  setUserRole: (email: string, role: Exclude<Role, "admin">) => Promise<{ ok: boolean; error?: string }>;
  canAccess: (tab: TabKey) => boolean;
}

const Ctx = createContext<AuthCtx | null>(null);

const USER_KEY  = "tss_user";
const USERS_KEY = "tss_users";
const TOKEN_KEY = "tss_token";

const AUTH_BASE = (import.meta.env.VITE_AUTH_BASE_URL as string | undefined) ?? "";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem(TOKEN_KEY);
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function apiPost(path: string, body: object) {
  return fetch(`${AUTH_BASE}/api/auth/v2${path}`, {
    method: "POST",
    headers: authHeaders(),
    credentials: "include",
    body: JSON.stringify(body),
  });
}

function apiGet(path: string) {
  return fetch(`${AUTH_BASE}/api/auth/v2${path}`, {
    headers: authHeaders(),
    credentials: "include",
  });
}

function safeRead<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function apiRoleToAppRole(apiRole: ApiRole): Role {
  if (apiRole === "ref_admin")       return "admin";
  if (apiRole === "ref_memberplus")  return "privileged_user";
  return "normal_user";
}

function appRoleToApiRole(role: Exclude<Role, "admin">): ApiRole {
  return role === "privileged_user" ? "ref_memberplus" : "ref_member";
}

const LEGACY_DEMO_EMAILS = new Set([
  "admin@tss.com",
  "manager@tss.com",
  "analyst@tss.com",
  "viewer@tss.com",
  "intern@tss.com",
]);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]             = useState<SessionUser | null>(null);
  const [users, setUsers]           = useState<KnownUser[]>([]);
  const [otpPending, setOtpPending] = useState<OtpState | null>(null);
  const [hydrated, setHydrated]     = useState(false);

  useEffect(() => {
    // Clear stale permissions key left over from old code
    localStorage.removeItem("tss_permissions");

    const storedUsers = safeRead<KnownUser[]>(USERS_KEY, [])
      .filter((u) => !LEGACY_DEMO_EMAILS.has(u.email));
    setUsers(storedUsers);

    const storedSession = safeRead<SessionUser | null>(USER_KEY, null);
    if (storedSession && LEGACY_DEMO_EMAILS.has(storedSession.email)) {
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(TOKEN_KEY);
    }

    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      localStorage.removeItem(USER_KEY);
      setHydrated(true);
      return;
    }

    apiGet("/me")
      .then((res) => {
        if (!res.ok) {
          localStorage.removeItem(USER_KEY);
          localStorage.removeItem(TOKEN_KEY);
          return;
        }
        return res.json().then((data: { email: string; role: ApiRole }) => {
          const local = storedUsers.find((u) => u.email === data.email);
          const role  = local?.role ?? apiRoleToAppRole(data.role);
          const session: SessionUser = { email: data.email, role };
          localStorage.setItem(USER_KEY, JSON.stringify(session));
          setUser(session);
        });
      })
      .catch(() => {})
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }, [users, hydrated]);

  const requestOtp = useCallback(async (email: string) => {
    for (const role of ["ref_member", "ref_memberplus", "ref_admin"] as ApiRole[]) {
      const res = await apiPost("/request-otp", { email, role });
      if (res.ok) {
        setOtpPending({ email, role });
        return { ok: true };
      }
      if (res.status !== 403) {
        const data = await res.json().catch(() => ({})) as { message?: string };
        return { ok: false, error: data.message ?? "Failed to send OTP. Try again." };
      }
    }
    return { ok: false, error: "You're not registered yet. Ask your admin to add you from the Admin panel." };
  }, []);

  const verifyOtp = useCallback(async (otp: string) => {
    if (!otpPending) return { ok: false, error: "No OTP pending." };
    const { email, role } = otpPending;

    const res = await apiPost("/verify-otp", { email, role, otp });
    if (!res.ok) {
      const data = await res.json().catch(() => ({})) as { message?: string };
      return { ok: false, error: data.message ?? "Invalid or expired OTP." };
    }

    const data = await res.json() as { success: boolean; email: string; role: ApiRole; token: string };
    localStorage.setItem(TOKEN_KEY, data.token);

    const local   = users.find((u) => u.email === data.email);
    const appRole = local?.role ?? apiRoleToAppRole(data.role);
    const session: SessionUser = { email: data.email, role: appRole };
    localStorage.setItem(USER_KEY, JSON.stringify(session));
    setUser(session);
    setOtpPending(null);

    setUsers((prev) => {
      const exists = prev.find((u) => u.email === data.email);
      if (exists) return prev;
      return [...prev, { email: data.email, role: appRole }];
    });

    return { ok: true };
  }, [otpPending, users]);

  const cancelOtp = useCallback(() => setOtpPending(null), []);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await apiGet("/users");
      if (!res.ok) {
        console.error("fetchUsers: non-OK response", res.status);
        return;
      }
      const raw = await res.json();
      const list: Array<{ email: string; role: ApiRole; name?: string }> = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.data) ? raw.data
        : Array.isArray(raw?.users) ? raw.users
        : [];
      setUsers(list.map((u) => ({ email: u.email, role: apiRoleToAppRole(u.role), name: u.name })));
    } catch (err) {
      console.error("fetchUsers: network error", err);
    }
  }, []);

  const createUser = useCallback(async (email: string, appRole: Exclude<Role, "admin">) => {
    const res = await apiPost("/users", { email, role: appRoleToApiRole(appRole), name: email });
    if (!res.ok) {
      const data = await res.json().catch(() => ({})) as { message?: string };
      return { ok: false, error: data.message ?? "Failed to create user." };
    }
    setUsers((prev) => {
      const exists = prev.find((u) => u.email === email);
      if (exists) return prev.map((u) => u.email === email ? { ...u, role: appRole } : u);
      return [...prev, { email, role: appRole }];
    });
    return { ok: true };
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    apiPost("/logout", {}).catch(() => {});
  }, []);

  const setUserRole = useCallback(async (email: string, role: Exclude<Role, "admin">) => {
    const existing = users.find((u) => u.email === email);
    const name     = existing?.name ?? email;
    const res = await apiPost("/users", { email, role: appRoleToApiRole(role), name });
    if (!res.ok) {
      const data = await res.json().catch(() => ({})) as { message?: string };
      return { ok: false, error: data.message ?? "Failed to update user." };
    }
    setUsers((prev) =>
      prev.map((u) => (u.role === "admin" || u.email !== email ? u : { ...u, role })),
    );
    setUser((prev) => {
      if (!prev || prev.email !== email || prev.role === "admin") return prev;
      const updated = { ...prev, role };
      localStorage.setItem(USER_KEY, JSON.stringify(updated));
      return updated;
    });
    return { ok: true };
  }, [users]);

  // Only the admin tab requires admin role — all other tabs are open to everyone
  const canAccess = useCallback(
    (tab: TabKey) => {
      if (!user) return false;
      if (tab === "admin") return user.role === "admin";
      return true;
    },
    [user],
  );

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      users,
      otpPending,
      requestOtp,
      verifyOtp,
      cancelOtp,
      logout,
      fetchUsers,
      createUser,
      setUserRole,
      canAccess,
    }),
    [user, users, otpPending, requestOtp, verifyOtp, cancelOtp, logout, fetchUsers, createUser, setUserRole, canAccess],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
