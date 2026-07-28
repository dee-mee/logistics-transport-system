import { createContext, useContext, useEffect, useState } from "react";
import client from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("wb_token");
    if (!token) {
      setLoading(false);
      return;
    }
    client
      .get("/auth/me/")
      .then((res) => setUser(res.data))
      .catch(() => localStorage.removeItem("wb_token"))
      .finally(() => setLoading(false));
  }, []);

  async function login(username, password) {
    const res = await client.post("/auth/login/", { username, password });
    localStorage.setItem("wb_token", res.data.token);
    setUser(res.data.user);
  }

  async function register(payload) {
    const res = await client.post("/auth/register/", payload);
    localStorage.setItem("wb_token", res.data.token);
    setUser(res.data.user);
  }

  async function refreshUser() {
    const res = await client.get("/auth/me/");
    setUser(res.data);
  }

  async function logout() {
    try {
      await client.post("/auth/logout/");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem("wb_token");
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
