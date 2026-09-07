"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, AuthResponse, RegisterResponse } from "@/types";
import { api } from "@/lib/api";
import { getToken, setToken, clearSession, getStoredUser, setStoredUser } from "@/lib/auth";
import { wsClient } from "@/lib/websocket";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<AuthResponse>;
  register: (username: string, password: string, phone?: string) => Promise<RegisterResponse>;
  verifyOtp: (username: string, otp: string) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  updateProfile: (data: { display_name?: string; phone?: string; avatar_url?: string; about?: string }) => Promise<User>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize session on mount
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = getToken();
      const storedUser = getStoredUser();

      if (storedToken) {
        setTokenState(storedToken);
        if (storedUser) {
          setUser(storedUser);
          wsClient.connect(storedUser.id);
        }

        try {
          // Fetch fresh user profile
          const freshUser = await api.getMe();
          setUser(freshUser);
          setStoredUser(freshUser);
          wsClient.connect(freshUser.id);
        } catch {
          // If token expired/invalid
          clearSession();
          setUser(null);
          setTokenState(null);
          wsClient.disconnect();
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (username: string, password: string): Promise<AuthResponse> => {
    const response = await api.login({ username, password });
    setToken(response.access_token);
    setTokenState(response.access_token);

    const freshUser = await api.getMe();
    setUser(freshUser);
    setStoredUser(freshUser);
    wsClient.connect(freshUser.id);

    return response;
  };

  const register = async (username: string, password: string, phone?: string): Promise<RegisterResponse> => {
    return await api.register({ username, password, phone });
  };

  const verifyOtp = async (username: string, otp: string): Promise<AuthResponse> => {
    const response = await api.verifyOtp({ username, otp });
    setToken(response.access_token);
    setTokenState(response.access_token);

    const freshUser = await api.getMe();
    setUser(freshUser);
    setStoredUser(freshUser);
    wsClient.connect(freshUser.id);

    return response;
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      // ignore
    } finally {
      wsClient.disconnect();
      clearSession();
      setUser(null);
      setTokenState(null);
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
  };

  const updateProfile = async (data: { display_name?: string; phone?: string; avatar_url?: string; about?: string }): Promise<User> => {
    const updated = await api.updateProfile(data);
    setUser(updated);
    setStoredUser(updated);
    return updated;
  };

  const refreshUser = async () => {
    try {
      const freshUser = await api.getMe();
      setUser(freshUser);
      setStoredUser(freshUser);
    } catch {
      // ignore
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user && !!token,
        login,
        register,
        verifyOtp,
        logout,
        updateProfile,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
