import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import AppShell from "./components/AppShell";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Shipments from "./pages/Shipments";
import Fleet from "./pages/Fleet";
import Trips from "./pages/Trips";
import LiveMap from "./pages/LiveMap";
import Alerts from "./pages/Alerts";
import FuelManagement from "./pages/Fuel";
import Maintenance from "./pages/Maintenance";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Notifications from "./pages/Notifications";
import Users from "./pages/Users";
import Organization from "./pages/Organization";
import Reports from "./pages/Reports";

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-700/50 text-sm">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-700/50 text-sm">Loading…</div>;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <AppShell />
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="shipments" element={<Shipments />} />
        <Route path="fleet" element={<Fleet />} />
        <Route path="trips" element={<Trips />} />
        <Route path="live-map" element={<LiveMap />} />
        <Route path="alerts" element={<Alerts />} />
        <Route path="fuel" element={<FuelManagement />} />
        <Route path="maintenance" element={<Maintenance />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="users" element={<Users />} />
        <Route path="organization" element={<Organization />} />
        <Route path="reports" element={<Reports />} />
        <Route path="profile" element={<Profile />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
