import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import client from "../api/client";
import StatusBadge from "../components/StatusBadge";
import ManifestTag from "../components/ManifestTag";

function AddVehicleModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ plate_number: "", vehicle_type: "van", make: "", model: "", capacity_kg: "" });
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
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Capacity (kg)</label>
            <input type="number" step="0.01" value={form.capacity_kg}
              onChange={(e) => setForm({ ...form, capacity_kg: e.target.value })}
              className="w-full border border-line rounded-lg px-3 py-2 text-sm" />
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
  const [showAdd, setShowAdd] = useState(false);

  function load() {
    client.get("/fleet/vehicles/").then((res) => setVehicles(res.data.results ?? res.data));
    client.get("/fleet/drivers/").then((res) => setDrivers(res.data.results ?? res.data));
  }

  useEffect(load, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink mb-1">Fleet</h1>
          <p className="text-sm text-ink-700/60">Vehicles and drivers available for dispatch.</p>
        </div>
        {tab === "vehicles" && (
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-ink text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-ink-700 transition-colors">
            <Plus size={16} /> Add vehicle
          </button>
        )}
      </div>

      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab("vehicles")}
          className={`text-sm font-medium px-3 py-1.5 rounded-full ${tab === "vehicles" ? "bg-ink text-white" : "bg-line/40 text-ink-700"}`}>
          Vehicles ({vehicles.length})
        </button>
        <button onClick={() => setTab("drivers")}
          className={`text-sm font-medium px-3 py-1.5 rounded-full ${tab === "drivers" ? "bg-ink text-white" : "bg-line/40 text-ink-700"}`}>
          Drivers ({drivers.length})
        </button>
      </div>

      <div className="bg-white border border-line rounded-xl overflow-hidden">
        {tab === "vehicles" ? (
          vehicles.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-ink-700/50">No vehicles yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-ink-700/50">
                  <th className="px-5 py-3 font-medium">Plate</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Make / Model</th>
                  <th className="px-5 py-3 font-medium">Capacity</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map((v) => (
                  <tr key={v.id} className="border-b border-line last:border-0">
                    <td className="px-5 py-3"><ManifestTag>{v.plate_number}</ManifestTag></td>
                    <td className="px-5 py-3 text-ink-700 capitalize">{v.vehicle_type}</td>
                    <td className="px-5 py-3 text-ink-700">{[v.make, v.model].filter(Boolean).join(" ") || "—"}</td>
                    <td className="px-5 py-3 text-ink-700">{v.capacity_kg} kg</td>
                    <td className="px-5 py-3"><StatusBadge status={v.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : drivers.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-ink-700/50">No drivers yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-ink-700/50">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">License</th>
                <th className="px-5 py-3 font-medium">Vehicle</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((d) => (
                <tr key={d.id} className="border-b border-line last:border-0">
                  <td className="px-5 py-3 text-ink-700">{d.user_name}</td>
                  <td className="px-5 py-3"><ManifestTag>{d.license_number}</ManifestTag></td>
                  <td className="px-5 py-3 text-ink-700">{d.assigned_vehicle_plate || "Unassigned"}</td>
                  <td className="px-5 py-3"><StatusBadge status={d.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showAdd && <AddVehicleModal onClose={() => setShowAdd(false)} onCreated={() => { setShowAdd(false); load(); }} />}
    </div>
  );
}
