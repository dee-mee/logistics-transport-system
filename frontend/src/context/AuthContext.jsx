import { createContext, useContext, useEffect, useState } from "react";
import client from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const accessToken = localStorage.getItem("wb_access_token");
    const refreshToken = localStorage.getItem("wb_refresh_token");
    if (!accessToken) {
      setLoading(false);
      return;
    }
    client
      .get("/auth/me/")
      .then((res) => setUser(res.data))
      .catch(() => {
        localStorage.removeItem("wb_access_token");
        localStorage.removeItem("wb_refresh_token");
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(username, password) {
    try {
      const res = await client.post("/auth/login/", { username, password });
      console.log("Login response:", res.data); // Debug log
      
      // Check if response has the expected structure
      if (!res.data.access || !res.data.refresh) {
        throw new Error("Invalid response from server");
      }
      
      localStorage.setItem("wb_access_token", res.data.access);
      localStorage.setItem("wb_refresh_token", res.data.refresh);
      
      if (res.data.user) {
        setUser(res.data.user);
      } else {
        // If user data not in response, fetch it
        await refreshUser();
      }
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  }

  async function register(payload) {
    const res = await client.post("/auth/register/", payload);
    localStorage.setItem("wb_access_token", res.data.access);
    localStorage.setItem("wb_refresh_token", res.data.refresh);
    setUser(res.data.user);
  }

  async function refreshUser() {
    const res = await client.get("/auth/me/");
    setUser(res.data);
  }

  async function logout() {
    try {
      const refreshToken = localStorage.getItem("wb_refresh_token");
      await client.post("/auth/logout/", { refresh: refreshToken });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem("wb_access_token");
      localStorage.removeItem("wb_refresh_token");
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
