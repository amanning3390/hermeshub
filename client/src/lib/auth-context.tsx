/**
 * Auth context for HermesHub.
 *
 * On mount we read the current session from `GET /api/v1/auth/me`. Two identity
 * paths exist: GitHub OAuth (handled server-side) and anonymous browser
 * keypairs. `loginAnonymous()` mints a server keypair; the private key is
 * returned once and stored locally so the holder can sign bids/declarations.
 * GitHub OAuth UI is intentionally omitted for the demo (anonymous is enough).
 */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

export interface SessionUser {
  kind: string;
  didWeb: string | null;
  githubId: string | null;
  login: string | null;
  name: string | null;
  avatarUrl: string | null;
}

/** Local identity material for the anonymous keypair (never leaves the browser). */
export interface LocalIdentity {
  didWeb: string;
  publicKey: string;
  privateKey: string;
}

const IDENTITY_KEY = "hh_identity";
const AGENTS_KEY = "hh_owned_agents";

function readIdentity(): LocalIdentity | null {
  try {
    const raw = localStorage.getItem(IDENTITY_KEY);
    return raw ? (JSON.parse(raw) as LocalIdentity) : null;
  } catch {
    return null;
  }
}

export function readOwnedAgentIds(): string[] {
  try {
    const raw = localStorage.getItem(AGENTS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function rememberOwnedAgent(agentId: string): void {
  const ids = readOwnedAgentIds();
  if (!ids.includes(agentId)) {
    localStorage.setItem(AGENTS_KEY, JSON.stringify([...ids, agentId]));
  }
}

interface AuthContextValue {
  user: SessionUser | null;
  identity: LocalIdentity | null;
  loading: boolean;
  loginAnonymous: () => Promise<LocalIdentity>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  identity: null,
  loading: true,
  loginAnonymous: async () => {
    throw new Error("AuthProvider not mounted");
  },
  logout: async () => {},
  refresh: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [identity, setIdentity] = useState<LocalIdentity | null>(() => readIdentity());
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await apiRequest<{ user: SessionUser | null }>("GET", "/api/v1/auth/me");
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const loginAnonymous = useCallback(async () => {
    const data = await apiRequest<{ did_web: string; public_key: string; private_key: string }>(
      "POST",
      "/api/v1/auth/anonymous",
    );
    const next: LocalIdentity = {
      didWeb: data.did_web,
      publicKey: data.public_key,
      privateKey: data.private_key,
    };
    localStorage.setItem(IDENTITY_KEY, JSON.stringify(next));
    setIdentity(next);
    await refresh();
    return next;
  }, [refresh]);

  const logout = useCallback(async () => {
    try {
      await apiRequest("POST", "/api/v1/auth/logout");
    } finally {
      setUser(null);
      void queryClient.invalidateQueries();
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, identity, loading, loginAnonymous, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
