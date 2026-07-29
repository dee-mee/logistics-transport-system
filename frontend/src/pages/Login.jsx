import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      console.log("Attempting login with username:", username);
      await login(username, password);
      console.log("Login successful, navigating to dashboard");
      // Force navigation after a small delay to ensure state is updated
      setTimeout(() => {
        navigate("/");
      }, 100);
    } catch (err) {
      console.error("Login failed:", err);
      if (err.isPermissionError) {
        setError(err.customMessage || "Permission denied");
      } else if (err.isLockedError) {
        setError(err.customMessage || "Account locked");
      } else if (err.response) {
        // Backend responded with error
        console.error("Backend error response:", err.response.data);
        setError(err.response.data.detail || "Login failed. Please check your credentials.");
      } else if (err.request) {
        // Request made but no response
        console.error("No response from server:", err.message);
        setError("Network error. Please check your connection.");
      } else {
        // Other error
        console.error("Unexpected error:", err.message);
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="font-display font-semibold text-2xl text-white tracking-tight">Waybill</div>
          <div className="text-sm text-white/40 mt-1">Sign in to dispatch operations</div>
        </div>
        <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 space-y-4 shadow-xl">
          {error && (
            <div className="text-sm text-red-700 bg-red-100 rounded-lg px-3 py-2">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
              autoComplete="username"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
              autoComplete="current-password"
              required
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-gray-900 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
