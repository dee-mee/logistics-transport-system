import { useEffect, useState } from "react";
import { Package, Truck, Users, Route } from "lucide-react";
import client from "../api/client";
import StatusBadge from "../components/StatusBadge";
import ManifestTag from "../components/ManifestTag";
import { Link } from "react-router-dom";

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="bg-white border border-line rounded-xl px-5 py-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-lg bg-teal-light text-teal flex items-center justify-center shrink-0">
        <Icon size={18} />
      </div>
      <div>
        <div className="text-2xl font-display font-semibold text-ink leading-none">{value}</div>
        <div className="text-xs text-ink-700/60 mt-1">{label}</div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState({ shipments: 0, vehicles: 0, drivers: 0, trips: 0 });
  const [recentShipments, setRecentShipments] = useState([]);

  useEffect(() => {
    Promise.all([
      client.get("/orders/shipments/?page_size=5"),
      client.get("/fleet/vehicles/"),
      client.get("/fleet/drivers/"),
      client.get("/dispatch/trips/"),
    ]).then(([shipments, vehicles, drivers, trips]) => {
      setStats({
        shipments: shipments.data.count ?? shipments.data.length,
        vehicles: vehicles.data.count ?? vehicles.data.length,
        drivers: drivers.data.count ?? drivers.data.length,
        trips: trips.data.count ?? trips.data.length,
      });
      setRecentShipments((shipments.data.results ?? shipments.data).slice(0, 5));
    }).catch(() => {});
  }, []);

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink mb-1">Dashboard</h1>
      <p className="text-sm text-ink-700/60 mb-6">Today's snapshot across orders and fleet.</p>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard icon={Package} label="Shipments" value={stats.shipments} />
        <StatCard icon={Truck} label="Vehicles" value={stats.vehicles} />
        <StatCard icon={Users} label="Drivers" value={stats.drivers} />
        <StatCard icon={Route} label="Trips" value={stats.trips} />
      </div>

      <div className="bg-white border border-line rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-line flex items-center justify-between">
          <h2 className="font-medium text-ink">Recent shipments</h2>
          <Link to="/shipments" className="text-sm text-teal font-medium hover:underline">View all</Link>
        </div>
        {recentShipments.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-ink-700/50">
            No shipments yet — create one from the Shipments page.
          </div>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {recentShipments.map((s) => (
                <tr key={s.id} className="border-b border-line last:border-0">
                  <td className="px-5 py-3"><ManifestTag>{s.tracking_code}</ManifestTag></td>
                  <td className="px-5 py-3 text-ink-700">{s.pickup_address} → {s.dropoff_address}</td>
                  <td className="px-5 py-3"><StatusBadge status={s.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
