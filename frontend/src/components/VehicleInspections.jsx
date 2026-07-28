import { useState, useEffect } from 'react';
import { Plus, X, Search, Filter, MoreVertical, ClipboardCheck, AlertTriangle } from 'lucide-react';
import client from '../api/client';
import StatusBadge from '../components/StatusBadge';

function AddInspectionModal({ onClose, onCreated, vehicles, drivers }) {
  const [form, setForm] = useState({ 
    vehicle: '', driver: '', inspection_type: 'daily', status: 'passed',
    odometer_reading: '', issues_found: '', immediate_actions: '' 
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await client.post("/fleet/inspections/", form);
      onCreated();
    } catch {
      setError("Couldn't add that inspection — please check the form data.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-900/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-lg text-gray-900">Add inspection</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Vehicle</label>
            <select required value={form.vehicle} onChange={(e) => setForm({ ...form, vehicle: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="">Select vehicle</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.plate_number}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Driver (optional)</label>
            <select value={form.driver} onChange={(e) => setForm({ ...form, driver: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="">Select driver</option>
              {drivers.map(d => (
                <option key={d.id} value={d.id}>{d.user_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Inspection type</label>
            <select value={form.inspection_type} onChange={(e) => setForm({ ...form, inspection_type: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="pre_trip">Pre-Trip</option>
              <option value="post_trip">Post-Trip</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="annual">Annual</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="passed">Passed</option>
              <option value="failed">Failed</option>
              <option value="conditional">Conditional</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Odometer reading</label>
            <input type="number" value={form.odometer_reading} onChange={(e) => setForm({ ...form, odometer_reading: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Issues found</label>
            <textarea value={form.issues_found} onChange={(e) => setForm({ ...form, issues_found: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" rows="2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Immediate actions</label>
            <textarea value={form.immediate_actions} onChange={(e) => setForm({ ...form, immediate_actions: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" rows="2" />
          </div>
          <button type="submit" disabled={busy}
            className="w-full bg-[#1e3a8a] text-white rounded-lg py-2.5 text-sm font-medium hover:bg-[#1e40af] transition-colors disabled:opacity-50">
            {busy ? "Adding…" : "Add inspection"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function VehicleInspections() {
  const [inspections, setInspections] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState('all');

  async function load() {
    try {
      const [inspectionsRes, vehiclesRes, driversRes] = await Promise.all([
        client.get("/fleet/inspections/").catch(() => ({ data: [] })),
        client.get("/fleet/vehicles/").catch(() => ({ data: [] })),
        client.get("/fleet/drivers/").catch(() => ({ data: [] })),
      ]);

      setInspections(inspectionsRes.data.results ?? inspectionsRes.data);
      setVehicles(vehiclesRes.data.results ?? vehiclesRes.data);
      setDrivers(driversRes.data.results ?? driversRes.data);
    } catch (error) {
      console.error('Error loading inspections:', error);
    }
  }

  useEffect(() => {
    load();
    // Refresh data every 60 seconds
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, []);

  const filteredInspections = filter === 'all' 
    ? inspections 
    : inspections.filter(i => i.status === filter);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-navy mb-1">Vehicle Inspections</h2>
          <p className="text-sm text-gray-500">Track pre-trip, post-trip, and periodic inspections</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-ink text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-ink-700 transition-colors">
          <Plus size={16} /> Add inspection
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        <button onClick={() => setFilter('all')}
          className={`text-sm font-medium px-3 py-1.5 rounded-full ${filter === 'all' ? "bg-[#1e3a8a] text-white" : "bg-gray-100 text-gray-700"}`}>
          All ({inspections.length})
        </button>
        <button onClick={() => setFilter('passed')}
          className={`text-sm font-medium px-3 py-1.5 rounded-full ${filter === 'passed' ? "bg-green-600 text-white" : "bg-gray-100 text-gray-700"}`}>
          Passed
        </button>
        <button onClick={() => setFilter('failed')}
          className={`text-sm font-medium px-3 py-1.5 rounded-full ${filter === 'failed' ? "bg-red-600 text-white" : "bg-gray-100 text-gray-700"}`}>
          Failed
        </button>
        <button onClick={() => setFilter('conditional')}
          className={`text-sm font-medium px-3 py-1.5 rounded-full ${filter === 'conditional' ? "bg-yellow-600 text-white" : "bg-gray-100 text-gray-700"}`}>
          Conditional
        </button>
      </div>

      <div className="bg-white border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Search size={18} className="text-gray-400" />
            <input 
              type="text" 
              placeholder="Search inspections..." 
              className="text-sm border-0 focus:ring-0 px-0 w-64"
            />
          </div>
          <button className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
            <Filter size={16} /> Filter
          </button>
        </div>
        
        {filteredInspections.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-gray-500">No inspections found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                <th className="px-5 py-3 font-medium">Vehicle</th>
                <th className="px-5 py-3 font-medium">Driver</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Odometer</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInspections.map((inspection) => (
                <tr key={inspection.id} className="border-b border-gray-200 last:border-0 hover:bg-gray-50">
                  <td className="px-5 py-3 text-gray-700">{inspection.vehicle_plate}</td>
                  <td className="px-5 py-3 text-gray-700">{inspection.driver_name || "—"}</td>
                  <td className="px-5 py-3 text-gray-700 capitalize">{inspection.inspection_type?.replace('_', ' ')}</td>
                  <td className="px-5 py-3 text-gray-700">{new Date(inspection.inspection_date).toLocaleDateString()}</td>
                  <td className="px-5 py-3 text-gray-700">{inspection.odometer_reading?.toLocaleString() || 0} km</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={inspection.status} />
                  </td>
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
      </div>

      {showAdd && <AddInspectionModal onClose={() => setShowAdd(false)} onCreated={() => { setShowAdd(false); load(); }} vehicles={vehicles} drivers={drivers} />}
    </div>
  );
}