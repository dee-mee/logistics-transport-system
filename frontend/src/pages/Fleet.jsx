import { useEffect, useState } from "react";
import { Plus, X, Search, Filter, MoreVertical, BarChart3, Edit, Trash2 } from "lucide-react";
import client from "../api/client";
import StatusBadge from "../components/StatusBadge";
import ManifestTag from "../components/ManifestTag";
import FleetStats from "../components/FleetStats";
import DocumentManagement from "../components/DocumentManagement";
import VehicleInspections from "../components/VehicleInspections";
import FleetAnalytics from "../components/FleetAnalytics";

function formatDriverName(driver) {
  if (driver?.user_first_name && driver?.user_last_name) {
    return `${driver.user_first_name} ${driver.user_last_name}`;
  }
  return driver?.user_username || driver?.user_name || "Unknown";
}

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

function AddDriverModal({ drivers, onClose, onCreated }) {
  const [form, setForm] = useState({ 
    user: "", license_number: "", license_type: "commercial", 
    employment_type: "full_time", status: "available", license_expiry: "",
    assigned_vehicle: "", emergency_contact_name: "", emergency_contact_phone: ""
  });
  const [users, setUsers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    client.get("/auth/users/").then((res) => setUsers(res.data.results ?? res.data));
    client.get("/fleet/vehicles/").then((res) => setVehicles(res.data.results ?? res.data));
  }, []);

  const selectedUser = users.find(u => u.id === form.user);
  const existingDriverUserIds = new Set(drivers.map((driver) => driver.user).filter(Boolean));
  const assignedDriversByVehicle = new Map(
    drivers
      .filter((driver) => (driver.assigned_vehicle || driver.assigned_vehicle_id))
      .map((driver) => {
        const vehicleId = driver.assigned_vehicle || driver.assigned_vehicle_id;
        const driverName = formatDriverName(driver);
        return [vehicleId, driverName];
      })
  );

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      // Set default license expiry to 1 year from now if not provided
      const formData = { ...form };
      if (!formData.license_expiry) {
        const expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        formData.license_expiry = expiryDate.toISOString().split('T')[0];
      }
      // Convert empty string to null for assigned_vehicle
      if (formData.assigned_vehicle === "") {
        formData.assigned_vehicle = null;
      }
      
      await client.post("/fleet/drivers/", formData);
      onCreated();
    } catch (err) {
      console.error('Error adding driver:', err);
      const errorMessage = err.response?.data?.detail || err.response?.data?.error || 
                          Object.values(err.response?.data || {}).flat().join(', ') ||
                          "Couldn't add that driver — check the license number isn't already in use.";
      setError(errorMessage);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-line flex items-center justify-between">
          <h2 className="font-display font-semibold text-lg text-ink">Add driver</h2>
          <button onClick={onClose} className="text-ink-700/50 hover:text-ink"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="text-sm text-rust bg-rust-light rounded-lg px-3 py-2">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">User</label>
            <select required value={form.user} onChange={(e) => setForm({ ...form, user: e.target.value })}
              className="w-full border border-line rounded-lg px-3 py-2 text-sm">
              <option value="">Select a user…</option>
              {users.filter((u) => !existingDriverUserIds.has(u.id)).map((u) => (
                <option key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.username})</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">Users who already have driver profiles are hidden.</p>
          </div>
          {selectedUser && (
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">Phone number</label>
              <div className="w-full border border-line rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-600">
                {selectedUser.phone_number || "Not set in user profile"}
              </div>
              <p className="text-xs text-gray-500 mt-1">Will be synced from user profile</p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">License number</label>
            <input required value={form.license_number}
              onChange={(e) => setForm({ ...form, license_number: e.target.value })}
              className="w-full border border-line rounded-lg px-3 py-2 text-sm font-mono" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">License type</label>
            <select value={form.license_type} onChange={(e) => setForm({ ...form, license_type: e.target.value })}
              className="w-full border border-line rounded-lg px-3 py-2 text-sm">
              <option value="commercial">Commercial</option>
              <option value="heavy_vehicle">Heavy Vehicle</option>
              <option value="passenger">Passenger</option>
              <option value="hazardous">Hazardous Materials</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">License expiry</label>
            <input type="date" value={form.license_expiry}
              onChange={(e) => setForm({ ...form, license_expiry: e.target.value })}
              className="w-full border border-line rounded-lg px-3 py-2 text-sm" />
            <p className="text-xs text-gray-500 mt-1">Defaults to 1 year from now if not set</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Assigned vehicle</label>
            <select value={form.assigned_vehicle} onChange={(e) => setForm({ ...form, assigned_vehicle: e.target.value })}
              className="w-full border border-line rounded-lg px-3 py-2 text-sm">
              <option value="">Unassigned</option>
              {vehicles.map((v) => {
                const assignedDriverName = assignedDriversByVehicle.get(v.id);
                return (
                  <option key={v.id} value={v.id} disabled={Boolean(assignedDriverName)}>
                    {assignedDriverName
                      ? `${v.plate_number} - ${v.make} ${v.model} (assigned to ${assignedDriverName})`
                      : `${v.plate_number} - ${v.make} ${v.model}`}
                  </option>
                );
              })}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Vehicles already assigned to another driver are shown as unavailable.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Employment type</label>
            <select value={form.employment_type} onChange={(e) => setForm({ ...form, employment_type: e.target.value })}
              className="w-full border border-line rounded-lg px-3 py-2 text-sm">
              <option value="full_time">Full Time</option>
              <option value="part_time">Part Time</option>
              <option value="contractor">Contractor</option>
              <option value="temporary">Temporary</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full border border-line rounded-lg px-3 py-2 text-sm">
              <option value="available">Available</option>
              <option value="on_trip">On Trip</option>
              <option value="off_duty">Off Duty</option>
              <option value="on_leave">On Leave</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">Emergency contact</label>
              <input value={form.emergency_contact_name}
                onChange={(e) => setForm({ ...form, emergency_contact_name: e.target.value })}
                className="w-full border border-line rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">Emergency phone</label>
              <input value={form.emergency_contact_phone}
                onChange={(e) => setForm({ ...form, emergency_contact_phone: e.target.value })}
                className="w-full border border-line rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <button type="submit" disabled={busy}
            className="w-full bg-ink text-white rounded-lg py-2.5 text-sm font-medium hover:bg-ink-700 transition-colors disabled:opacity-50">
            {busy ? "Adding…" : "Add driver"}
          </button>
        </form>
      </div>
    </div>
  );
}

function EditVehicleModal({ vehicle, onClose, onUpdated }) {
  const [form, setForm] = useState({ 
    plate_number: "", vehicle_type: "van", make: "", model: "", 
    year: "", capacity_kg: "", status: "available" 
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (vehicle) {
      setForm({
        plate_number: vehicle.plate_number || "",
        vehicle_type: vehicle.vehicle_type || "van",
        make: vehicle.make || "",
        model: vehicle.model || "",
        year: vehicle.year || "",
        capacity_kg: vehicle.capacity_kg || "",
        status: vehicle.status || "available"
      });
    }
  }, [vehicle]);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await client.put(`/fleet/vehicles/${vehicle.id}/`, form);
      onUpdated();
    } catch (err) {
      console.error('Error updating vehicle:', err);
      const errorMessage = err.response?.data?.detail || err.response?.data?.error || 
                          Object.values(err.response?.data || {}).flat().join(', ') ||
                          "Couldn't update that vehicle — check the plate number isn't already in use.";
      setError(errorMessage);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-line flex items-center justify-between">
          <h2 className="font-display font-semibold text-lg text-ink">Edit vehicle</h2>
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
            {busy ? "Updating…" : "Update vehicle"}
          </button>
        </form>
      </div>
    </div>
  );
}

function EditDriverModal({ driver, drivers, onClose, onUpdated }) {
  const [form, setForm] = useState({ 
    license_number: "", license_type: "commercial", 
    employment_type: "full_time", status: "available", license_expiry: "",
    assigned_vehicle: "", emergency_contact_name: "", emergency_contact_phone: ""
  });
  const [vehicles, setVehicles] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    client.get("/fleet/vehicles/").then((res) => setVehicles(res.data.results ?? res.data));
    if (driver) {
      setForm({
        license_number: driver.license_number || "",
        license_type: driver.license_type || "commercial",
        employment_type: driver.employment_type || "full_time",
        status: driver.status || "available",
        license_expiry: driver.license_expiry ? driver.license_expiry.split('T')[0] : "",
        assigned_vehicle: driver.assigned_vehicle || driver.assigned_vehicle_id || "",
        emergency_contact_name: driver.emergency_contact_name || "",
        emergency_contact_phone: driver.emergency_contact_phone || ""
      });
    }
  }, [driver]);

  const currentVehicleId = driver?.assigned_vehicle || driver?.assigned_vehicle_id || "";
  const assignedDriversByVehicle = new Map(
    drivers
      .filter((item) => item.id !== driver?.id)
      .filter((item) => (item.assigned_vehicle || item.assigned_vehicle_id))
      .map((item) => {
        const vehicleId = item.assigned_vehicle || item.assigned_vehicle_id;
        const driverName = formatDriverName(item);
        return [vehicleId, driverName];
      })
  );

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const formData = { ...form };
      if (formData.assigned_vehicle === "") {
        formData.assigned_vehicle = null;
      }

      delete formData.user;

      if (formData.license_expiry === "") {
        delete formData.license_expiry;
      }
      if (formData.emergency_contact_name === "") {
        delete formData.emergency_contact_name;
      }
      if (formData.emergency_contact_phone === "") {
        delete formData.emergency_contact_phone;
      }

      const response = await client.patch(`/fleet/drivers/${driver.id}/`, formData);
      onUpdated?.(response.data);
    } catch (err) {
      console.error('Error updating driver:', err);
      const errorMessage = err.response?.data?.detail || err.response?.data?.error || 
                          Object.values(err.response?.data || {}).flat().join(', ') ||
                          "Couldn't update that driver — check the license number isn't already in use.";
      setError(errorMessage);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-line flex items-center justify-between">
          <h2 className="font-display font-semibold text-lg text-ink">Edit driver</h2>
          <button onClick={onClose} className="text-ink-700/50 hover:text-ink"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="text-sm text-rust bg-rust-light rounded-lg px-3 py-2">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">License number</label>
            <input required value={form.license_number}
              onChange={(e) => setForm({ ...form, license_number: e.target.value })}
              className="w-full border border-line rounded-lg px-3 py-2 text-sm font-mono" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">License type</label>
            <select value={form.license_type} onChange={(e) => setForm({ ...form, license_type: e.target.value })}
              className="w-full border border-line rounded-lg px-3 py-2 text-sm">
              <option value="commercial">Commercial</option>
              <option value="heavy_vehicle">Heavy Vehicle</option>
              <option value="passenger">Passenger</option>
              <option value="hazardous">Hazardous Materials</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">License expiry</label>
            <input type="date" value={form.license_expiry}
              onChange={(e) => setForm({ ...form, license_expiry: e.target.value })}
              className="w-full border border-line rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Assigned vehicle</label>
            <select value={form.assigned_vehicle} onChange={(e) => setForm({ ...form, assigned_vehicle: e.target.value })}
              className="w-full border border-line rounded-lg px-3 py-2 text-sm">
              <option value="">Unassigned</option>
              {vehicles.map((v) => {
                const assignedDriverName = assignedDriversByVehicle.get(v.id);
                const isCurrentVehicle = v.id === currentVehicleId;
                return (
                  <option key={v.id} value={v.id} disabled={Boolean(assignedDriverName) && !isCurrentVehicle}>
                    {assignedDriverName && !isCurrentVehicle
                      ? `${v.plate_number} - ${v.make} ${v.model} (assigned to ${assignedDriverName})`
                      : `${v.plate_number} - ${v.make} ${v.model}`}
                  </option>
                );
              })}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Vehicles already assigned to another driver are shown as unavailable.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Employment type</label>
            <select value={form.employment_type} onChange={(e) => setForm({ ...form, employment_type: e.target.value })}
              className="w-full border border-line rounded-lg px-3 py-2 text-sm">
              <option value="full_time">Full Time</option>
              <option value="part_time">Part Time</option>
              <option value="contractor">Contractor</option>
              <option value="temporary">Temporary</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full border border-line rounded-lg px-3 py-2 text-sm">
              <option value="available">Available</option>
              <option value="on_trip">On Trip</option>
              <option value="off_duty">Off Duty</option>
              <option value="on_leave">On Leave</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Phone number</label>
            <div className="w-full border border-line rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-600">
              {driver?.user_phone || driver?.phone_number || "Not set in user profile"}
            </div>
            <p className="text-xs text-gray-500 mt-1">Synced from user profile</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">Emergency contact</label>
              <input value={form.emergency_contact_name}
                onChange={(e) => setForm({ ...form, emergency_contact_name: e.target.value })}
                className="w-full border border-line rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">Emergency phone</label>
              <input value={form.emergency_contact_phone}
                onChange={(e) => setForm({ ...form, emergency_contact_phone: e.target.value })}
                className="w-full border border-line rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <button type="submit" disabled={busy}
            className="w-full bg-ink text-white rounded-lg py-2.5 text-sm font-medium hover:bg-ink-700 transition-colors disabled:opacity-50">
            {busy ? "Updating…" : "Update driver"}
          </button>
        </form>
      </div>
    </div>
  );
}

function AddMaintenanceModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ 
    vehicle: "", maintenance_type: "routine", priority: "medium", status: "scheduled",
    description: "", scheduled_date: "", estimated_cost: ""
  });
  const [vehicles, setVehicles] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    client.get("/fleet/vehicles/").then((res) => setVehicles(res.data.results ?? res.data));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await client.post("/fleet/maintenance-records/", form);
      onCreated();
    } catch (err) {
      console.error('Error adding maintenance:', err);
      const errorMessage = err.response?.data?.detail || err.response?.data?.error || 
                          Object.values(err.response?.data || {}).flat().join(', ') ||
                          "Couldn't add that maintenance record.";
      setError(errorMessage);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-line flex items-center justify-between">
          <h2 className="font-display font-semibold text-lg text-ink">Add maintenance</h2>
          <button onClick={onClose} className="text-ink-700/50 hover:text-ink"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="text-sm text-rust bg-rust-light rounded-lg px-3 py-2">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Vehicle</label>
            <select required value={form.vehicle} onChange={(e) => setForm({ ...form, vehicle: e.target.value })}
              className="w-full border border-line rounded-lg px-3 py-2 text-sm">
              <option value="">Select a vehicle…</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>{v.plate_number} - {v.make} {v.model}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Maintenance type</label>
            <select value={form.maintenance_type} onChange={(e) => setForm({ ...form, maintenance_type: e.target.value })}
              className="w-full border border-line rounded-lg px-3 py-2 text-sm">
              <option value="routine">Routine Service</option>
              <option value="repair">Repair</option>
              <option value="inspection">Inspection</option>
              <option value="emergency">Emergency Repair</option>
              <option value="upgrade">Upgrade</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Priority</label>
            <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}
              className="w-full border border-line rounded-lg px-3 py-2 text-sm">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Description</label>
            <textarea required value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full border border-line rounded-lg px-3 py-2 text-sm" rows="3" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">Scheduled date</label>
              <input type="date" value={form.scheduled_date}
                onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })}
                className="w-full border border-line rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">Estimated cost</label>
              <input type="number" step="0.01" value={form.estimated_cost}
                onChange={(e) => setForm({ ...form, estimated_cost: e.target.value })}
                className="w-full border border-line rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <button type="submit" disabled={busy}
            className="w-full bg-ink text-white rounded-lg py-2.5 text-sm font-medium hover:bg-ink-700 transition-colors disabled:opacity-50">
            {busy ? "Adding…" : "Add maintenance"}
          </button>
        </form>
      </div>
    </div>
  );
}

function EditMaintenanceModal({ maintenance, onClose, onUpdated }) {
  const [form, setForm] = useState({ 
    vehicle: "", maintenance_type: "routine", priority: "medium", status: "scheduled",
    description: "", scheduled_date: "", estimated_cost: "", work_performed: "", actual_cost: ""
  });
  const [vehicles, setVehicles] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    client.get("/fleet/vehicles/").then((res) => setVehicles(res.data.results ?? res.data));
    if (maintenance) {
      setForm({
        vehicle: maintenance.vehicle || "",
        maintenance_type: maintenance.maintenance_type || "routine",
        priority: maintenance.priority || "medium",
        status: maintenance.status || "scheduled",
        description: maintenance.description || "",
        scheduled_date: maintenance.scheduled_date ? maintenance.scheduled_date.split('T')[0] : "",
        estimated_cost: maintenance.estimated_cost || "",
        work_performed: maintenance.work_performed || "",
        actual_cost: maintenance.actual_cost || ""
      });
    }
  }, [maintenance]);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await client.put(`/fleet/maintenance-records/${maintenance.id}/`, form);
      onUpdated();
    } catch (err) {
      console.error('Error updating maintenance:', err);
      const errorMessage = err.response?.data?.detail || err.response?.data?.error || 
                          Object.values(err.response?.data || {}).flat().join(', ') ||
                          "Couldn't update that maintenance record.";
      setError(errorMessage);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-line flex items-center justify-between">
          <h2 className="font-display font-semibold text-lg text-ink">Edit maintenance</h2>
          <button onClick={onClose} className="text-ink-700/50 hover:text-ink"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="text-sm text-rust bg-rust-light rounded-lg px-3 py-2">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Vehicle</label>
            <select required value={form.vehicle} onChange={(e) => setForm({ ...form, vehicle: e.target.value })}
              className="w-full border border-line rounded-lg px-3 py-2 text-sm">
              <option value="">Select a vehicle…</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>{v.plate_number} - {v.make} {v.model}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Maintenance type</label>
            <select value={form.maintenance_type} onChange={(e) => setForm({ ...form, maintenance_type: e.target.value })}
              className="w-full border border-line rounded-lg px-3 py-2 text-sm">
              <option value="routine">Routine Service</option>
              <option value="repair">Repair</option>
              <option value="inspection">Inspection</option>
              <option value="emergency">Emergency Repair</option>
              <option value="upgrade">Upgrade</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Priority</label>
            <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}
              className="w-full border border-line rounded-lg px-3 py-2 text-sm">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full border border-line rounded-lg px-3 py-2 text-sm">
              <option value="scheduled">Scheduled</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Description</label>
            <textarea required value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full border border-line rounded-lg px-3 py-2 text-sm" rows="3" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">Scheduled date</label>
              <input type="date" value={form.scheduled_date}
                onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })}
                className="w-full border border-line rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">Estimated cost</label>
              <input type="number" step="0.01" value={form.estimated_cost}
                onChange={(e) => setForm({ ...form, estimated_cost: e.target.value })}
                className="w-full border border-line rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Work performed</label>
            <textarea value={form.work_performed}
              onChange={(e) => setForm({ ...form, work_performed: e.target.value })}
              className="w-full border border-line rounded-lg px-3 py-2 text-sm" rows="2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Actual cost</label>
            <input type="number" step="0.01" value={form.actual_cost}
              onChange={(e) => setForm({ ...form, actual_cost: e.target.value })}
              className="w-full border border-line rounded-lg px-3 py-2 text-sm" />
          </div>
          <button type="submit" disabled={busy}
            className="w-full bg-ink text-white rounded-lg py-2.5 text-sm font-medium hover:bg-ink-700 transition-colors disabled:opacity-50">
            {busy ? "Updating…" : "Update maintenance"}
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
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [showAddDriver, setShowAddDriver] = useState(false);
  const [editVehicle, setEditVehicle] = useState(null);
  const [editDriver, setEditDriver] = useState(null);
  const [showAddMaintenance, setShowAddMaintenance] = useState(false);
  const [editMaintenance, setEditMaintenance] = useState(null);
  const [fleetStats, setFleetStats] = useState({});
  const [driverStats, setDriverStats] = useState({});
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [driverSearch, setDriverSearch] = useState("");
  const [maintenanceSearch, setMaintenanceSearch] = useState("");
  const [vehicleStatusFilter, setVehicleStatusFilter] = useState("all");
  const [driverStatusFilter, setDriverStatusFilter] = useState("all");
  const [maintenanceStatusFilter, setMaintenanceStatusFilter] = useState("all");
  const [feedback, setFeedback] = useState(null);

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

  async function handleDelete(resource, id, label) {
    const confirmed = window.confirm(`Delete ${label}? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      await client.delete(resource);
      setFeedback({ type: "success", message: `${label} deleted successfully.` });
      await load();
    } catch (error) {
      console.error(`Error deleting ${label}:`, error);
      const errorMessage = error.response?.data?.detail || error.response?.data?.error ||
        `Couldn't delete ${label}.`;
      setFeedback({ type: "error", message: errorMessage });
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!feedback) return undefined;
    const timeout = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(timeout);
  }, [feedback]);

  const filteredVehicles = vehicles.filter((vehicle) => {
    const search = vehicleSearch.trim().toLowerCase();
    const matchesSearch = !search || [
      vehicle.plate_number,
      vehicle.vehicle_type,
      vehicle.make,
      vehicle.model,
    ].filter(Boolean).some((value) => value.toLowerCase().includes(search));
    const matchesStatus = vehicleStatusFilter === "all" || vehicle.status === vehicleStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredDrivers = drivers.filter((driver) => {
    const search = driverSearch.trim().toLowerCase();
    const matchesSearch = !search || [
      formatDriverName(driver),
      driver.license_number,
      driver.license_type,
      driver.assigned_vehicle_plate,
      driver.user_phone,
    ].filter(Boolean).some((value) => value.toLowerCase().includes(search));
    const matchesStatus = driverStatusFilter === "all" || driver.status === driverStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredMaintenance = maintenance.filter((record) => {
    const search = maintenanceSearch.trim().toLowerCase();
    const matchesSearch = !search || [
      record.vehicle_plate,
      record.maintenance_type,
      record.description,
      record.priority,
    ].filter(Boolean).some((value) => value.toLowerCase().includes(search));
    const matchesStatus = maintenanceStatusFilter === "all" || record.status === maintenanceStatusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Fleet Management</h1>
        <p className="text-sm text-gray-500">Manage vehicles, drivers, and maintenance schedules.</p>
      </div>

      {feedback && (
        <div className={`mb-4 rounded-lg px-4 py-3 text-sm ${
          feedback.type === "success"
            ? "bg-green-50 text-green-700 border border-green-200"
            : "bg-red-50 text-red-700 border border-red-200"
        }`}>
          {feedback.message}
        </div>
      )}
      
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
                  value={vehicleSearch}
                  onChange={(e) => setVehicleSearch(e.target.value)}
                  className="text-sm border-0 focus:ring-0 px-0 w-64"
                />
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Filter size={16} />
                  <select
                    value={vehicleStatusFilter}
                    onChange={(e) => setVehicleStatusFilter(e.target.value)}
                    className="border border-gray-200 rounded-lg px-2 py-1 text-sm"
                  >
                    <option value="all">All statuses</option>
                    <option value="available">Available</option>
                    <option value="on_trip">On Trip</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="out_of_service">Out of Service</option>
                    <option value="retired">Retired</option>
                  </select>
                </div>
                <button onClick={() => setShowAddVehicle(true)}
                  className="flex items-center gap-2 bg-[#1e3a8a] text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-[#1e40af] transition-colors">
                  <Plus size={16} /> Add vehicle
                </button>
              </div>
            </div>
            {filteredVehicles.length === 0 ? (
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
                  {filteredVehicles.map((v) => (
                    <tr key={v.id} className="border-b border-gray-200 last:border-0 hover:bg-gray-50">
                      <td className="px-5 py-3"><ManifestTag>{v.plate_number}</ManifestTag></td>
                      <td className="px-5 py-3 text-gray-700 capitalize">{v.vehicle_type}</td>
                      <td className="px-5 py-3 text-gray-700">{[v.make, v.model].filter(Boolean).join(" ") || "—"}</td>
                      <td className="px-5 py-3 text-gray-700">{v.year || "—"}</td>
                      <td className="px-5 py-3 text-gray-700">{v.capacity_kg} kg</td>
                      <td className="px-5 py-3 text-gray-700">{v.current_odometer?.toLocaleString() || 0} km</td>
                      <td className="px-5 py-3"><StatusBadge status={v.status} /></td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => setEditVehicle(v)}
                            className="p-1 hover:bg-gray-100 rounded"
                            title="Edit"
                          >
                            <Edit size={16} className="text-gray-400" />
                          </button>
                          <button 
                            onClick={() => handleDelete(`/fleet/vehicles/${v.id}/`, v.id, `vehicle ${v.plate_number}`)}
                            className="p-1 hover:bg-gray-100 rounded"
                            title="Delete"
                          >
                            <Trash2 size={16} className="text-gray-400" />
                          </button>
                        </div>
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
                  value={driverSearch}
                  onChange={(e) => setDriverSearch(e.target.value)}
                  className="text-sm border-0 focus:ring-0 px-0 w-64"
                />
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Filter size={16} />
                  <select
                    value={driverStatusFilter}
                    onChange={(e) => setDriverStatusFilter(e.target.value)}
                    className="border border-gray-200 rounded-lg px-2 py-1 text-sm"
                  >
                    <option value="all">All statuses</option>
                    <option value="available">Available</option>
                    <option value="on_trip">On Trip</option>
                    <option value="off_duty">Off Duty</option>
                    <option value="on_leave">On Leave</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
                <button onClick={() => setShowAddDriver(true)}
                  className="flex items-center gap-2 bg-[#1e3a8a] text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-[#1e40af] transition-colors">
                  <Plus size={16} /> Add driver
                </button>
              </div>
            </div>
            {filteredDrivers.length === 0 ? (
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
                  {filteredDrivers.map((d) => (
                    <tr key={d.id} className="border-b border-gray-200 last:border-0 hover:bg-gray-50">
                      <td className="px-5 py-3 text-gray-700">
                        {formatDriverName(d)}
                      </td>
                      <td className="px-5 py-3"><ManifestTag>{d.license_number}</ManifestTag></td>
                      <td className="px-5 py-3 text-gray-700">{d.license_type || "—"}</td>
                      <td className="px-5 py-3 text-gray-700">{d.assigned_vehicle_plate || "Unassigned"}</td>
                      <td className="px-5 py-3 text-gray-700 capitalize">{d.employment_type?.replace('_', ' ') || "—"}</td>
                      <td className="px-5 py-3"><StatusBadge status={d.status} /></td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => setEditDriver(d)}
                            className="p-1 hover:bg-gray-100 rounded"
                            title="Edit"
                          >
                            <Edit size={16} className="text-gray-400" />
                          </button>
                          <button 
                            onClick={() => handleDelete(`/fleet/drivers/${d.id}/`, d.id, `driver ${formatDriverName(d)}`)}
                            className="p-1 hover:bg-gray-100 rounded"
                            title="Delete"
                          >
                            <Trash2 size={16} className="text-gray-400" />
                          </button>
                        </div>
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
                  value={maintenanceSearch}
                  onChange={(e) => setMaintenanceSearch(e.target.value)}
                  className="text-sm border-0 focus:ring-0 px-0 w-64"
                />
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Filter size={16} />
                  <select
                    value={maintenanceStatusFilter}
                    onChange={(e) => setMaintenanceStatusFilter(e.target.value)}
                    className="border border-gray-200 rounded-lg px-2 py-1 text-sm"
                  >
                    <option value="all">All statuses</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <button onClick={() => setShowAddMaintenance(true)}
                  className="flex items-center gap-2 bg-[#1e3a8a] text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-[#1e40af] transition-colors">
                  <Plus size={16} /> Add maintenance
                </button>
              </div>
            </div>
            {filteredMaintenance.length === 0 ? (
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
                  {filteredMaintenance.map((m) => (
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
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => setEditMaintenance(m)}
                            className="p-1 hover:bg-gray-100 rounded"
                            title="Edit"
                          >
                            <Edit size={16} className="text-gray-400" />
                          </button>
                          <button 
                            onClick={() => handleDelete(`/fleet/maintenance-records/${m.id}/`, m.id, `maintenance record for ${m.vehicle_plate}`)}
                            className="p-1 hover:bg-gray-100 rounded"
                            title="Delete"
                          >
                            <Trash2 size={16} className="text-gray-400" />
                          </button>
                        </div>
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

      {showAddVehicle && <AddVehicleModal onClose={() => setShowAddVehicle(false)} onCreated={() => { setShowAddVehicle(false); load(); }} />}
      {showAddDriver && <AddDriverModal
        drivers={drivers}
        onClose={() => setShowAddDriver(false)}
        onCreated={() => { setShowAddDriver(false); load(); }}
      />}
      {editVehicle && <EditVehicleModal vehicle={editVehicle} onClose={() => setEditVehicle(null)} onUpdated={() => { setEditVehicle(null); load(); }} />}
      {editDriver && <EditDriverModal
        driver={editDriver}
        drivers={drivers}
        onClose={() => setEditDriver(null)}
        onUpdated={(updatedDriver) => {
          if (updatedDriver) {
            setDrivers((prev) =>
              prev.map((d) => (d.id === updatedDriver.id ? { ...d, ...updatedDriver } : d))
            );
          }
          setEditDriver(null);
          load();
        }}
      />}
      {showAddMaintenance && <AddMaintenanceModal onClose={() => setShowAddMaintenance(false)} onCreated={() => { setShowAddMaintenance(false); load(); }} />}
      {editMaintenance && <EditMaintenanceModal maintenance={editMaintenance} onClose={() => setEditMaintenance(null)} onUpdated={() => { setEditMaintenance(null); load(); }} />}
    </>
  );
}