import React, { createContext, useContext, useState, useEffect } from "react";

export interface User {
  id: string;
  username: string;
  email: string;
  avatar: string;
  role: "user" | "admin";
  createdAt: string;
  isVerified?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (username: string, email: string, password: string, rememberMe?: boolean) => Promise<void>;
  verifyEmail: () => Promise<void>;
  resetPassword: (email: string, newPassword: string) => Promise<void>;
  logout: () => void;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem("eerie_echoes_token") || sessionStorage.getItem("eerie_echoes_token"));
  const [loading, setLoading] = useState(true);

  // Fetch current user details on boot if token exists
  useEffect(() => {
    const fetchMe = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch("/api/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
        } else {
          // Token expired or invalid
          logout();
        }
      } catch (error) {
        console.error("Error fetching current user:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMe();
  }, [token]);

  const login = async (email: string, password: string, rememberMe: boolean = true) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Login failed");
    }

    if (rememberMe) {
      localStorage.setItem("eerie_echoes_token", data.token);
    } else {
      sessionStorage.setItem("eerie_echoes_token", data.token);
    }
    setToken(data.token);
    setUser(data.user);
  };

  const register = async (username: string, email: string, password: string, rememberMe: boolean = true) => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Registration failed");
    }

    if (rememberMe) {
      localStorage.setItem("eerie_echoes_token", data.token);
    } else {
      sessionStorage.setItem("eerie_echoes_token", data.token);
    }
    setToken(data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem("eerie_echoes_token");
    sessionStorage.removeItem("eerie_echoes_token");
    setToken(null);
    setUser(null);
  };

  const verifyEmail = async () => {
    const res = await authFetch("/api/auth/verify", { method: "POST" });
    if (!res.ok) throw new Error("Verification failed");
    if (user) setUser({ ...user, isVerified: true });
  };

  const resetPassword = async (email: string, newPassword: string) => {
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, newPassword }),
    });
    if (!res.ok) throw new Error("Password reset failed");
  };

  // Helper fetch function that automatically appends Auth header if logged in
  const authFetch = async (url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers || {});
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return fetch(url, {
      ...options,
      headers,
    });
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, verifyEmail, resetPassword, logout, authFetch }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
