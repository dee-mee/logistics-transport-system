import { NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, Package, Truck, Route, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/shipments", label: "Shipments", icon: Package },
  { to: "/fleet", label: "Fleet", icon: Truck },
  { to: "/trips", label: "Trips", icon: Route },
];

export default function AppShell() {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen bg-paper">
      <aside className="w-60 shrink-0 bg-ink text-white flex flex-col">
        <div className="px-6 py-6 border-b border-white/10">
          <div className="font-display font-semibold text-lg tracking-tight">Waybill</div>
          <div className="text-xs text-white/40 mt-0.5">Logistics Ops</div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              <Icon size={17} strokeWidth={2} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-white/10">
          <div className="px-3 py-2 text-sm">
            <div className="font-medium">{user?.username}</div>
            <div className="text-xs text-white/40 capitalize">{user?.role}</div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/60 hover:bg-white/5 hover:text-white transition-colors"
          >
            <LogOut size={17} strokeWidth={2} />
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
