import { useEffect, useState } from "react";
import { Plus, X, Search, Filter, MoreVertical, BarChart3 } from "lucide-react";
import client from "../api/client";
import StatusBadge from "../components/StatusBadge";
import ManifestTag from "../components/ManifestTag";
import FleetStats from "../components/FleetStats";
import DocumentManagement from "../components/DocumentManagement";
import VehicleInspections from "../components/VehicleInspections";
import FleetAnalytics from "../components/FleetAnalytics";

function AddVehicleModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ 
    plate_number: "", vehicle_type: "van", make: "", model: "", 
    year: "", capacity_kg: "", status: "available" 
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await client.post("/fleet/vehicles/", form);
      onCreated();
    } catch {
      setError("Couldn't add that vehicle — check the plate number isn't already in use.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-line flex items-center justify-between">
          <h2 className="font-display font-semibold text-lg text-ink">Add vehicle</h2>
          <button onClick={onClose} className="text-ink-700/50 hover:text-ink"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="text-sm text-rust bg-rust-light rounded-lg px-3 py-2">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Plate number</label>
            <input required value={form.plate_number}
              onChange={(e) => setForm({ ...form, plate_number: e.target.value })}
              className="w-full border border-line rounded-lg px-3 py-2 text-sm font-mono" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Type</label>
            <select value={form.vehicle_type} onChange={(e) => setForm({ ...form, vehicle_type: e.target.value })}
              className="w-full border border-line rounded-lg px-3 py-2 text-sm">
              <option value="van">Van</option>
              <option value="truck">Truck</option>
              <option value="motorbike">Motorbike</option>
              <option value="trailer">Trailer</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Make" value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })}
              className="border border-line rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Model" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })}
              className="border border-line rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input type="number" placeholder="Year" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })}
              className="border border-line rounded-lg px-3 py-2 text-sm" />
            <input type="number" step="0.01" placeholder="Capacity (kg)" value={form.capacity_kg}
              onChange={(e) => setForm({ ...form, capacity_kg: e.target.value })}
              className="border border-line rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full border border-line rounded-lg px-3 py-2 text-sm">
              <option value="available">Available</option>
              <option value="on_trip">On Trip</option>
              <option value="maintenance">Under Maintenance</option>
              <option value="out_of_service">Out of Service</option>
              <option value="retired">Retired</option>
            </select>
          </div>
          <button type="submit" disabled={busy}
            className="w-full bg-ink text-white rounded-lg py-2.5 text-sm font-medium hover:bg-ink-700 transition-colors disabled:opacity-50">
            {busy ? "Adding…" : "Add vehicle"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function Fleet() {
  const [tab, setTab] = useState("vehicles");
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [fleetStats, setFleetStats] = useState({});
  const [driverStats, setDriverStats] = useState({});

  async function load() {
    try {
      const [vehiclesRes, driversRes, maintenanceRes, vehicleStatsRes, driverStatsRes] = await Promise.all([
        client.get("/fleet/vehicles/").catch(() => ({ data: [] })),
        client.get("/fleet/drivers/").catch(() => ({ data: [] })),
        client.get("/fleet/maintenance-records/").catch(() => ({ data: [] })),
        client.get("/fleet/vehicles/analytics/").catch(() => ({ data: {} })),
        client.get("/fleet/drivers/analytics/").catch(() => ({ data: {} })),
      ]);

      setVehicles(vehiclesRes.data.results ?? vehiclesRes.data);
      setDrivers(driversRes.data.results ?? driversRes.data);
      setMaintenance(maintenanceRes.data.results ?? maintenanceRes.data);
      setFleetStats(vehicleStatsRes.data);
      setDriverStats(driverStatsRes.data);
    } catch (error) {
      console.error('Error loading fleet data:', error);
    }
  }

  useEffect(() => {
    load();
    // Refresh data every 60 seconds
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Fleet Management</h1>
        <p className="text-sm text-gray-500">Manage vehicles, drivers, and maintenance schedules.</p>
      </div>
      
      <FleetStats vehicleStats={fleetStats} driverStats={driverStats} />
      
      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab("vehicles")}
          className={`text-sm font-medium px-4 py-2 rounded-lg ${tab === "vehicles" ? "bg-[#1e3a8a] text-white" : "bg-gray-100 text-gray-700"}`}>
          Vehicles ({vehicles.length})
        </button>
        <button onClick={() => setTab("drivers")}
          className={`text-sm font-medium px-4 py-2 rounded-lg ${tab === "drivers" ? "bg-[#1e3a8a] text-white" : "bg-gray-100 text-gray-700"}`}>
          Drivers ({drivers.length})
        </button>
        <button onClick={() => setTab("maintenance")}
          className={`text-sm font-medium px-4 py-2 rounded-lg ${tab === "maintenance" ? "bg-[#1e3a8a] text-white" : "bg-gray-100 text-gray-700"}`}>
          Maintenance ({maintenance.length})
        </button>
        <button onClick={() => setTab("documents")}
          className={`text-sm font-medium px-4 py-2 rounded-lg ${tab === "documents" ? "bg-[#1e3a8a] text-white" : "bg-gray-100 text-gray-700"}`}>
          Documents
        </button>
        <button onClick={() => setTab("inspections")}
          className={`text-sm font-medium px-4 py-2 rounded-lg ${tab === "inspections" ? "bg-[#1e3a8a] text-white" : "bg-gray-100 text-gray-700"}`}>
          Inspections
        </button>
        <button onClick={() => setTab("analytics")}
          className={`text-sm font-medium px-4 py-2 rounded-lg ${tab === "analytics" ? "bg-[#1e3a8a] text-white" : "bg-gray-100 text-gray-700"}`}>
          <BarChart3 size={16} className={tab === "analytics" ? "" : "inline"} /> Analytics
        </button>
      </div>

      <div className="bg-white border border-gray-200 overflow-hidden">
        {tab === "vehicles" && (
          <>
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Search size={18} className="text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search vehicles..." 
                  className="text-sm border-0 focus:ring-0 px-0 w-64"
                />
              </div>
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
                  <Filter size={16} /> Filter
                </button>
                <button onClick={() => setShowAdd(true)}
                  className="flex items-center gap-2 bg-[#1e3a8a] text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-[#1e40af] transition-colors">
                  <Plus size={16} /> Add vehicle
                </button>
              </div>
            </div>
            {vehicles.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-gray-500">No vehicles yet.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                    <th className="px-5 py-3 font-medium">Plate</th>
                    <th className="px-5 py-3 font-medium">Type</th>
                    <th className="px-5 py-3 font-medium">Make / Model</th>
                    <th className="px-5 py-3 font-medium">Year</th>
                    <th className="px-5 py-3 font-medium">Capacity</th>
                    <th className="px-5 py-3 font-medium">Odometer</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicles.map((v) => (
                    <tr key={v.id} className="border-b border-gray-200 last:border-0 hover:bg-gray-50">
                      <td className="px-5 py-3"><ManifestTag>{v.plate_number}</ManifestTag></td>
                      <td className="px-5 py-3 text-gray-700 capitalize">{v.vehicle_type}</td>
                      <td className="px-5 py-3 text-gray-700">{[v.make, v.model].filter(Boolean).join(" ") || "—"}</td>
                      <td className="px-5 py-3 text-gray-700">{v.year || "—"}</td>
                      <td className="px-5 py-3 text-gray-700">{v.capacity_kg} kg</td>
                      <td className="px-5 py-3 text-gray-700">{v.current_odometer?.toLocaleString() || 0} km</td>
                      <td className="px-5 py-3"><StatusBadge status={v.status} /></td>
                      <td className="px-5 py-3">
                        <button className="p-1 hover:bg-gray-100 rounded">
                          <MoreVertical size={16} className="text-gray-400" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
        {tab === "drivers" && (
          <>
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Search size={18} className="text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search drivers..." 
                  className="text-sm border-0 focus:ring-0 px-0 w-64"
                />
              </div>
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
                  <Filter size={16} /> Filter
                </button>
                <button className="flex items-center gap-2 bg-[#1e3a8a] text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-[#1e40af] transition-colors">
                  <Plus size={16} /> Add driver
                </button>
              </div>
            </div>
            {drivers.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-gray-500">No drivers yet.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                    <th className="px-5 py-3 font-medium">Name</th>
                    <th className="px-5 py-3 font-medium">License</th>
                    <th className="px-5 py-3 font-medium">License Type</th>
                    <th className="px-5 py-3 font-medium">Vehicle</th>
                    <th className="px-5 py-3 font-medium">Employment</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {drivers.map((d) => (
                    <tr key={d.id} className="border-b border-gray-200 last:border-0 hover:bg-gray-50">
                      <td className="px-5 py-3 text-gray-700">{d.user_name}</td>
                      <td className="px-5 py-3"><ManifestTag>{d.license_number}</ManifestTag></td>
                      <td className="px-5 py-3 text-gray-700">{d.license_type || "—"}</td>
                      <td className="px-5 py-3 text-gray-700">{d.assigned_vehicle_plate || "Unassigned"}</td>
                      <td className="px-5 py-3 text-gray-700 capitalize">{d.employment_type?.replace('_', ' ') || "—"}</td>
                      <td className="px-5 py-3"><StatusBadge status={d.status} /></td>
                      <td className="px-5 py-3">
                        <button className="p-1 hover:bg-gray-100 rounded">
                          <MoreVertical size={16} className="text-gray-400" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
        {tab === "maintenance" && (
          <>
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Search size={18} className="text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search maintenance records..." 
                  className="text-sm border-0 focus:ring-0 px-0 w-64"
                />
              </div>
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
                  <Filter size={16} /> Filter
                </button>
                <button className="flex items-center gap-2 bg-[#1e3a8a] text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-[#1e40af] transition-colors">
                  <Plus size={16} /> Add maintenance
                </button>
              </div>
            </div>
            {maintenance.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-gray-500">No maintenance records yet.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                    <th className="px-5 py-3 font-medium">Vehicle</th>
                    <th className="px-5 py-3 font-medium">Type</th>
                    <th className="px-5 py-3 font-medium">Priority</th>
                    <th className="px-5 py-3 font-medium">Scheduled Date</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {maintenance.map((m) => (
                    <tr key={m.id} className="border-b border-gray-200 last:border-0 hover:bg-gray-50">
                      <td className="px-5 py-3 text-gray-700">{m.vehicle_plate}</td>
                      <td className="px-5 py-3 text-gray-700 capitalize">{m.maintenance_type?.replace('_', ' ')}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          m.priority === 'urgent' ? 'bg-red-100 text-red-600' :
                          m.priority === 'high' ? 'bg-yellow-100 text-yellow-600' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {m.priority}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-700">{m.scheduled_date || "—"}</td>
                      <td className="px-5 py-3"><StatusBadge status={m.status} /></td>
                      <td className="px-5 py-3">
                        <button className="p-1 hover:bg-gray-100 rounded">
                          <MoreVertical size={16} className="text-gray-400" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>
      
      {tab === "documents" && <DocumentManagement />}
      {tab === "inspections" && <VehicleInspections />}
      {tab === "analytics" && <FleetAnalytics />}

      {showAdd && <AddVehicleModal onClose={() => setShowAdd(false)} onCreated={() => { setShowAdd(false); load(); }} />}
    </>
  );
}