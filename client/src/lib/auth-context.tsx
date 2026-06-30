/**
 /** Auth context for HermesHub.
  *
  * Two identity paths:
  *   1. GitHub OAuth — redirects to GitHub, back to /api/v1/auth/callback.
  *      Used by humans who want a persistent, recoverable identity.
  *   2. Anonymous keypair — server generates Ed25519 keypair, private key
  *      stored in localStorage. Used by agents and quick-start users.
  * Both paths set a session cookie for subsequent requests.
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
   urnAir: string | null;
   githubId: string | null;
   login: string | null;
   name: string | null;
   avatarUrl: string | null;
 }

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
   loginGithub: () => void;
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
   loginGithub: () => {},
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
     const data = await apiRequest<{ urn_air: string; public_key: string; private_key: string }>(
       "POST",
       "/api/v1/auth/anonymous",
     );
     const next: LocalIdentity = {
       didWeb: data.urn_air,
       publicKey: data.public_key,
       privateKey: data.private_key,
     };
     localStorage.setItem(IDENTITY_KEY, JSON.stringify(next));
     setIdentity(next);
     await refresh();
     return next;
   }, [refresh]);

   const loginGithub = useCallback(() => {
     window.location.href = "/api/v1/auth/github";
   }, []);

   const logout = useCallback(async () => {
     try {
       await apiRequest("POST", "/api/v1/auth/logout");
     } finally {
       setUser(null);
       void queryClient.invalidateQueries();
     }
   }, []);

   return (
     <AuthContext.Provider value={{ user, identity, loading, loginAnonymous, loginGithub, logout, refresh }}>
       {children}
     </AuthContext.Provider>
   );
 }

 export function useAuth(): AuthContextValue {
   return useContext(AuthContext);
 }
