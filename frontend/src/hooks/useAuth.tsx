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
  /** Asks the backend to (re)send the verification email. Resolves with the server's message. */
  resendVerification: () => Promise<ResendVerificationResult>;
  /** Confirms an email-verification token from the emailed link. Resolves with the verified user. */
  verifyEmailToken: (token: string) => Promise<User>;
  /** Requests a password-reset email. Always resolves with a generic message (no account enumeration). */
  requestPasswordReset: (email: string) => Promise<string>;
  /** Sets a new password using the emailed reset token. Existing sessions are invalidated. */
  confirmPasswordReset: (token: string, newPassword: string) => Promise<string>;
  logout: () => void;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
  updateAvatar: (avatarUrl: string) => Promise<void>;
}

export interface ResendVerificationResult {
  message: string;
  isVerified: boolean;
}

interface MessageResponse {
  message?: string;
  error?: string;
}

/** Parses a JSON body without throwing on empty/non-JSON responses. */
const readJson = async <T,>(res: Response): Promise<Partial<T> & MessageResponse> => {
  try {
    return await res.json();
  } catch {
    return {};
  }
};

const postJson = (url: string, body: unknown) =>
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

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

  const resendVerification = async (): Promise<ResendVerificationResult> => {
    const res = await authFetch("/api/auth/verify", { method: "POST" });
    const data = await readJson<ResendVerificationResult>(res);
    if (!res.ok) throw new Error(data.error || "Could not send verification email");
    // Verification only happens via the emailed link; never flip isVerified locally here.
    return {
      message: data.message || "A verification link has been sent to your email.",
      isVerified: data.isVerified === true,
    };
  };

  const verifyEmailToken = async (verificationToken: string): Promise<User> => {
    const res = await postJson("/api/auth/verify-token", { token: verificationToken });
    const data = await readJson<{ user: User }>(res);
    if (!res.ok || !data.user) throw new Error(data.error || "Verification link is invalid or has expired");
    const verifiedUser = data.user;
    // Refresh auth state if the verified account is the one currently signed in.
    setUser((prev) => (prev && prev.id === verifiedUser.id ? verifiedUser : prev));
    return verifiedUser;
  };

  const requestPasswordReset = async (email: string): Promise<string> => {
    const res = await postJson("/api/auth/forgot-password", { email });
    const data = await readJson<MessageResponse>(res);
    if (!res.ok) throw new Error(data.error || "Could not request a password reset");
    return data.message || "If that email exists, a reset link has been sent.";
  };

  const confirmPasswordReset = async (resetToken: string, newPassword: string): Promise<string> => {
    const res = await postJson("/api/auth/reset-password-confirm", { token: resetToken, newPassword });
    const data = await readJson<MessageResponse>(res);
    if (!res.ok) throw new Error(data.error || "Reset link is invalid or has expired");
    // The backend invalidates previously issued JWTs, so drop any local session.
    logout();
    return data.message || "Your password has been reset.";
  };

  const updateAvatar = async (avatarUrl: string) => {
    const res = await authFetch("/api/auth/avatar", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avatar: avatarUrl }),
    });
    if (!res.ok) throw new Error("Failed to update avatar");
    const updatedUser = await res.json();
    setUser(updatedUser);
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
    <AuthContext.Provider value={{ user, token, loading, login, register, resendVerification, verifyEmailToken, requestPasswordReset, confirmPasswordReset, logout, authFetch, updateAvatar }}>
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
