import React, { createContext, useContext, useState, useEffect } from "react";
import { apiFetch } from "@/services/api";

export interface User {
  id: number;
  full_name: string;
  email: string;
  role: string;
  organization_id: number | null;
  organization_name?: string | null;
  is_temp_password: boolean;
  is_active: boolean;
  permissions?: {
    access_dashboard: boolean;
    access_content: boolean;
    access_masterclasses: boolean;
    access_meetings: boolean;
    access_feedback: boolean;
    allowed_tools: string[];
    allowed_categories: string[];
  } | null;
}

interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  role: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, role?: string) => Promise<void>;
  logout: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Initialize authentication from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedRole = localStorage.getItem("role");
    const storedUser = localStorage.getItem("user");

    if (storedToken && storedRole && storedUser) {
      setToken(storedToken);
      setRole(storedRole);
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        // Clear corrupt data
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("user");
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string, role?: string) => {
    setIsLoading(true);
    try {
      const response = await apiFetch<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password, role }),
      });

      if (response && response.access_token) {
        localStorage.setItem("token", response.access_token);
        localStorage.setItem("role", response.user.role);
        localStorage.setItem("user", JSON.stringify(response.user));

        setToken(response.access_token);
        setRole(response.user.role);
        setUser(response.user);
      } else {
        throw new Error("Invalid server response structure");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user");
    setToken(null);
    setRole(null);
    setUser(null);
    setSearchQuery("");
    // Redirect to landing page
    window.location.href = "/";
  };

  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role,
        isAuthenticated,
        isLoading,
        login,
        logout,
        searchQuery,
        setSearchQuery,
      }}
    >
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
