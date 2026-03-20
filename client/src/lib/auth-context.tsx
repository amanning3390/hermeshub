import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface Creator {
  id: string;
  github_username: string;
  email: string | null;
  avatar_url: string | null;
  wallet_address: string | null;
  wallet_chain: string | null;
  solana_address: string | null;
  stripe_account_id: string | null;
  verified: boolean;
  created_at: string;
}

interface AuthContextType {
  creator: Creator | null;
  token: string | null;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [creator, setCreator] = useState<Creator | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for token in URL params (from OAuth callback)
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.split("?")[1] || "");
    const urlToken = params.get("token");

    if (urlToken) {
      localStorage.setItem("hermeshub_token", urlToken);
      setToken(urlToken);
      // Clean up URL
      const cleanHash = hash.split("?")[0];
      window.location.hash = cleanHash;
    } else {
      // Try to load token from localStorage
      const stored = localStorage.getItem("hermeshub_token");
      if (stored) setToken(stored);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!token) {
      setCreator(null);
      return;
    }
    // Fetch creator profile
    fetch("/api/v1/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Unauthorized");
        return res.json();
      })
      .then((data) => setCreator(data))
      .catch(() => {
        localStorage.removeItem("hermeshub_token");
        setToken(null);
        setCreator(null);
      });
  }, [token]);

  const login = () => {
    window.location.href = "/api/v1/auth/github";
  };

  const logout = () => {
    localStorage.removeItem("hermeshub_token");
    setToken(null);
    setCreator(null);
  };

  return (
    <AuthContext.Provider value={{ creator, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
