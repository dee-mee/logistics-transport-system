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
      await login(username, password);
      navigate("/");
    } catch (err) {
      setError("Those credentials didn't match an account. Check them and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="font-display font-semibold text-2xl text-white tracking-tight">Waybill</div>
          <div className="text-sm text-white/40 mt-1">Sign in to dispatch operations</div>
        </div>
        <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 space-y-4 shadow-xl">
          {error && (
            <div className="text-sm text-rust bg-rust-light rounded-lg px-3 py-2">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal"
              autoComplete="username"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal"
              autoComplete="current-password"
              required
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-ink text-white rounded-lg py-2.5 text-sm font-medium hover:bg-ink-700 transition-colors disabled:opacity-50"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
