import { useEffect, useState } from "react";
import { Plus, X, MapPin, User, Truck, Play } from "lucide-react";
import client from "../api/client";
import StatusBadge from "../components/StatusBadge";
import ManifestTag from "../components/ManifestTag";
import LocationPicker from "../components/LocationPicker";
import DriverTracking from "../components/DriverTracking";
import { useAuth } from "../context/AuthContext";

const STATUS_OPTIONS = ["pending", "confirmed", "assigned", "in_transit", "delivered", "cancelled", "failed"];

function CreateShipmentModal({ onClose, onCreated }) {
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState({
    customer: "", pickup_address: "", dropoff_address: "", weight_kg: "", priority: "standard",
    pickup_lat: null, pickup_lng: null, dropoff_lat: null, dropoff_lng: null,
  });
  const [newCustomer, setNewCustomer] = useState({ contact_name: "", contact_phone: "", company_name: "" });
  const [useNewCustomer, setUseNewCustomer] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    client.get("/orders/customers/").then((res) => setCustomers(res.data.results ?? res.data));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      let customerId = form.customer;
      if (useNewCustomer) {
        const res = await client.post("/orders/customers/", newCustomer);
        customerId = res.data.id;
      }
      await client.post("/orders/shipments/", { 
        ...form, 
        customer: customerId,
        pickup_lat: form.pickup_lat,
        pickup_lng: form.pickup_lng,
        dropoff_lat: form.dropoff_lat,
        dropoff_lng: form.dropoff_lng
      });
      onCreated();
    } catch (err) {
      setError("Couldn't create that shipment — check the fields and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-line flex items-center justify-between sticky top-0 bg-white">
          <h2 className="font-display font-semibold text-lg text-ink">New shipment</h2>
          <button onClick={onClose} className="text-ink-700/50 hover:text-ink"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="text-sm text-rust bg-rust-light rounded-lg px-3 py-2">{error}</div>}

          <div>
            <div className="flex items-center gap-3 mb-2">
              <button type="button" onClick={() => setUseNewCustomer(true)}
                className={`text-xs font-medium px-2.5 py-1 rounded-full ${useNewCustomer ? "bg-teal-light text-teal" : "bg-line/40 text-ink-700"}`}>
                New customer
              </button>
              <button type="button" onClick={() => setUseNewCustomer(false)}
                className={`text-xs font-medium px-2.5 py-1 rounded-full ${!useNewCustomer ? "bg-teal-light text-teal" : "bg-line/40 text-ink-700"}`}>
                Existing customer
              </button>
            </div>
            {useNewCustomer ? (
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Contact name" required
                  value={newCustomer.contact_name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, contact_name: e.target.value })}
                  className="border border-line rounded-lg px-3 py-2 text-sm col-span-2" />
                <input placeholder="Phone" required
                  value={newCustomer.contact_phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, contact_phone: e.target.value })}
                  className="border border-line rounded-lg px-3 py-2 text-sm" />
                <input placeholder="Company (optional)"
                  value={newCustomer.company_name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, company_name: e.target.value })}
                  className="border border-line rounded-lg px-3 py-2 text-sm" />
              </div>
            ) : (
              <select required value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })}
                className="w-full border border-line rounded-lg px-3 py-2 text-sm">
                <option value="">Select a customer…</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.company_name || c.contact_name}</option>
                ))}
              </select>
            )}
          </div>

          <div>
            <LocationPicker
              label="Pickup address"
              value={form.pickup_address}
              onChange={(value) => setForm({ ...form, pickup_address: value })}
              onCoordinatesChange={(coords) => setForm({ ...form, pickup_lat: coords.lat, pickup_lng: coords.lng })}
            />
          </div>
          <div>
            <LocationPicker
              label="Dropoff address"
              value={form.dropoff_address}
              onChange={(value) => setForm({ ...form, dropoff_address: value })}
              onCoordinatesChange={(coords) => setForm({ ...form, dropoff_lat: coords.lat, dropoff_lng: coords.lng })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">Weight (kg)</label>
              <input type="number" step="0.01" value={form.weight_kg}
                onChange={(e) => setForm({ ...form, weight_kg: e.target.value })}
                className="w-full border border-line rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">Priority</label>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="w-full border border-line rounded-lg px-3 py-2 text-sm">
                <option value="standard">Standard</option>
                <option value="express">Express</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <button type="submit" disabled={busy}
            className="w-full bg-ink text-white rounded-lg py-2.5 text-sm font-medium hover:bg-ink-700 transition-colors disabled:opacity-50">
            {busy ? "Creating…" : "Create shipment"}
          </button>
        </form>
      </div>
    </div>
  );
}

function ShipmentDrawer({ shipment, onClose, onUpdated }) {
  const [events, setEvents] = useState([]);
  const [newStatus, setNewStatus] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [showAssignDriver, setShowAssignDriver] = useState(false);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [activeShipments, setActiveShipments] = useState([]);

  useEffect(() => {
    // Clear previous events when shipment changes
    setEvents([]);
    
    client.get(`/tracking/status-events/?shipment=${shipment.id}`)
      .then((res) => {
        console.log('ShipmentDrawer events for shipment:', shipment.id, res.data);
        setEvents(res.data.results ?? res.data);
      });
    
    // Load drivers and vehicles for assignment
    client.get("/fleet/drivers/").then((res) => setDrivers(res.data.results ?? res.data));
    client.get("/fleet/vehicles/").then((res) => setVehicles(res.data.results ?? res.data));
    
    // Load active shipments to check driver availability
    client.get("/orders/shipments/").then((res) => {
      const allShipments = res.data.results ?? res.data;
      const active = allShipments.filter(s => 
        s.status === 'assigned' || s.status === 'in_transit'
      );
      setActiveShipments(active);
    });
  }, [shipment.id]);

  // Helper to check if a driver is busy
  const isDriverBusy = (driverId) => {
    return activeShipments.some(s => s.driver === driverId && s.id !== shipment.id);
  };

  // Helper to get the busy driver's active shipment
  const getDriverActiveShipment = (driverId) => {
    return activeShipments.find(s => s.driver === driverId && s.id !== shipment.id);
  };

  async function addEvent(e) {
    e.preventDefault();
    if (!newStatus) return;
    setBusy(true);
    try {
      await client.post("/tracking/status-events/", { 
        shipment: shipment.id, 
        status: newStatus, 
        note,
        location_description: note
      });
      const res = await client.get(`/tracking/status-events/?shipment=${shipment.id}`);
      setEvents(res.data.results ?? res.data);
      setNote("");
      setNewStatus("");
      onUpdated();
    } catch (err) {
      console.error(err);
      alert("Failed to add status event");
    } finally {
      setBusy(false);
    }
  }

  async function assignDriver() {
    if (!selectedDriver) return;
    setBusy(true);
    try {
      await client.post(`/orders/shipments/${shipment.id}/assign_driver/`, {
        driver_id: selectedDriver,
        vehicle_id: selectedVehicle || null
      });
      setShowAssignDriver(false);
      setSelectedDriver("");
      setSelectedVehicle("");
      onUpdated();
    } catch (err) {
      console.error(err);
      // Handle busy driver error specifically
      if (err.response?.data?.driver_status === 'busy') {
        const activeShipments = err.response.data.active_shipments?.join(', ') || '';
        alert(`Driver is busy with active shipment(s): ${activeShipments}`);
      } else {
        alert(err.response?.data?.error || "Failed to assign driver");
      }
    } finally {
      setBusy(false);
    }
  }

  async function startTracking() {
    setBusy(true);
    try {
      await client.post(`/orders/shipments/${shipment.id}/start_tracking/`);
      
      // Create a status event with coordinates for tracking
      if (shipment.pickup_lat && shipment.pickup_lng) {
        await client.post("/tracking/status-events/", {
          shipment: shipment.id,
          status: "in_transit",
          location_description: "Tracking started",
          lat: shipment.pickup_lat,
          lng: shipment.pickup_lng
        });
      }
      
      onUpdated();
    } catch (err) {
      console.error(err);
      alert("Failed to start tracking");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-ink/40 flex justify-end z-50">
      <div className="bg-white w-full max-w-md h-full overflow-y-auto shadow-2xl">
        <div className="px-6 py-4 border-b border-line flex items-center justify-between sticky top-0 bg-white z-10">
          <ManifestTag>{shipment.tracking_code}</ManifestTag>
          <button onClick={onClose} className="text-ink-700/50 hover:text-ink"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-ink">Details</h3>
              <StatusBadge status={shipment.status} />
            </div>
            <dl className="text-sm space-y-2">
              <div className="flex justify-between"><dt className="text-ink-700/60">Pickup</dt><dd className="text-right">{shipment.pickup_address}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-700/60">Dropoff</dt><dd className="text-right">{shipment.dropoff_address}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-700/60">Weight</dt><dd>{shipment.weight_kg} kg</dd></div>
              <div className="flex justify-between"><dt className="text-ink-700/60">Priority</dt><dd className="capitalize">{shipment.priority}</dd></div>
              {shipment.driver_name && (
                <div className="flex justify-between"><dt className="text-ink-700/60">Driver</dt><dd className="text-right">{shipment.driver_name}</dd></div>
              )}
              {shipment.vehicle_plate && (
                <div className="flex justify-between"><dt className="text-ink-700/60">Vehicle</dt><dd className="text-right">{shipment.vehicle_plate}</dd></div>
              )}
            </dl>
          </div>

          <div className="border-t border-line pt-4">
            <h3 className="font-medium text-ink mb-3">Driver Assignment</h3>
            {!shipment.driver ? (
              <div className="space-y-3">
                {!showAssignDriver ? (
                  <button
                    onClick={() => setShowAssignDriver(true)}
                    className="w-full flex items-center justify-center gap-2 bg-teal text-white rounded-lg py-2.5 text-sm font-medium hover:bg-teal-700 transition-colors"
                  >
                    <User size={16} />
                    Assign Driver
                  </button>
                ) : (
                  <div className="space-y-3">
                    <select
                      value={selectedDriver}
                      onChange={(e) => setSelectedDriver(e.target.value)}
                      className="w-full border border-line rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="">Select driver…</option>
                      {drivers.map((driver) => {
                        const busy = isDriverBusy(driver.id);
                        return (
                          <option 
                            key={driver.id} 
                            value={driver.id}
                            disabled={busy}
                          >
                            {driver.user?.first_name} {driver.user?.last_name} ({driver.license_number})
                            {busy ? ' - Busy' : ''}
                          </option>
                        );
                      })}
                    </select>
                    {selectedDriver && isDriverBusy(selectedDriver) && (
                      <div className="text-xs text-rust bg-rust-light rounded-lg px-3 py-2">
                        This driver is currently busy with shipment: {getDriverActiveShipment(selectedDriver)?.tracking_code}
                      </div>
                    )}
                    <select
                      value={selectedVehicle}
                      onChange={(e) => setSelectedVehicle(e.target.value)}
                      className="w-full border border-line rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="">Select vehicle (optional)…</option>
                      {vehicles.map((vehicle) => (
                        <option key={vehicle.id} value={vehicle.id}>
                          {vehicle.plate_number} - {vehicle.make} {vehicle.model}
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <button
                        onClick={assignDriver}
                        disabled={busy || !selectedDriver}
                        className="flex-1 bg-ink text-white rounded-lg py-2 text-sm font-medium hover:bg-ink-700 transition-colors disabled:opacity-50"
                      >
                        {busy ? "Assigning…" : "Assign"}
                      </button>
                      <button
                        onClick={() => setShowAssignDriver(false)}
                        className="px-4 py-2 border border-line rounded-lg text-sm hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <User size={16} className="text-teal" />
                  <span className="font-medium">{shipment.driver_name}</span>
                  {shipment.vehicle_plate && (
                    <>
                      <Truck size={16} className="text-ink-700/50" />
                      <span>{shipment.vehicle_plate}</span>
                    </>
                  )}
                </div>
                {shipment.status === 'assigned' && (
                  <button
                    onClick={startTracking}
                    disabled={busy}
                    className="w-full flex items-center justify-center gap-2 bg-green-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    <Play size={16} />
                    {busy ? "Starting…" : "Start Tracking"}
                  </button>
                )}
              </div>
            )}
          </div>

          {shipment.status === 'in_transit' && shipment.driver && (
            <DriverTracking shipment={shipment} />
          )}

          <div>
            <h3 className="font-medium text-ink mb-3">Status timeline</h3>
            <div className="space-y-3">
              {events.length === 0 && <p className="text-sm text-ink-700/50">No status events logged yet.</p>}
              {events.map((ev) => (
                <div key={ev.id} className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-teal mt-1.5 shrink-0" />
                  <div className="flex-1 text-sm">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={ev.status} />
                      <span className="text-xs text-ink-700/50">{new Date(ev.created_at).toLocaleString()}</span>
                    </div>
                    {ev.note && <p className="text-ink-700/70 mt-1">{ev.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={addEvent} className="border-t border-line pt-4 space-y-3">
            <h3 className="font-medium text-ink text-sm">Log a status update</h3>
            <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}
              className="w-full border border-line rounded-lg px-3 py-2 text-sm">
              <option value="">Select status…</option>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
            </select>
            <input placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)}
              className="w-full border border-line rounded-lg px-3 py-2 text-sm" />
            <button type="submit" disabled={busy || !newStatus}
              className="w-full bg-ink text-white rounded-lg py-2 text-sm font-medium hover:bg-ink-700 transition-colors disabled:opacity-50">
              Add update
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function Shipments() {
  const { user } = useAuth();
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");

  function load() {
    setLoading(true);
    
    // Build query parameters based on user role
    let queryParams = [];
    if (statusFilter) {
      queryParams.push(`status=${statusFilter}`);
    }
    
    const q = queryParams.length > 0 ? `?${queryParams.join('&')}` : "";
    
    client.get(`/orders/shipments/${q}`)
      .then((res) => {
        // Backend now scopes shipments per-user automatically
        const shipments = res.data.results ?? res.data;
        setShipments(shipments);
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, [statusFilter, user]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink mb-1">Shipments</h1>
          <p className="text-sm text-ink-700/60">Every order moving through the network.</p>
        </div>
        {/* Only show New shipment button for non-drivers */}
        {user?.role !== 'driver' && (
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-ink text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-ink-700 transition-colors">
            <Plus size={16} /> New shipment
          </button>
        )}
      </div>

      <div className="flex gap-2 mb-4">
        <button onClick={() => setStatusFilter("")}
          className={`text-xs font-medium px-2.5 py-1 rounded-full ${!statusFilter ? "bg-ink text-white" : "bg-line/40 text-ink-700"}`}>
          All
        </button>
        {STATUS_OPTIONS.map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${statusFilter === s ? "bg-ink text-white" : "bg-line/40 text-ink-700"}`}>
            {s.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      <div className="bg-white border border-line rounded-xl overflow-hidden">
        {loading ? (
          <div className="px-5 py-8 text-center text-sm text-ink-700/50">Loading…</div>
        ) : shipments.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-ink-700/50">No shipments match this filter.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-ink-700/50">
                <th className="px-5 py-3 font-medium">Tracking</th>
                <th className="px-5 py-3 font-medium">Route</th>
                <th className="px-5 py-3 font-medium">Customer</th>
                <th className="px-5 py-3 font-medium">Priority</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {shipments.map((s) => (
                <tr key={s.id} onClick={() => setSelected(s)}
                  className="border-b border-line last:border-0 cursor-pointer hover:bg-paper/60">
                  <td className="px-5 py-3"><ManifestTag>{s.tracking_code}</ManifestTag></td>
                  <td className="px-5 py-3 text-ink-700">{s.pickup_address} → {s.dropoff_address}</td>
                  <td className="px-5 py-3 text-ink-700">{s.customer_name}</td>
                  <td className="px-5 py-3 text-ink-700 capitalize">{s.priority}</td>
                  <td className="px-5 py-3"><StatusBadge status={s.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && (
        <CreateShipmentModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(); }} />
      )}
      {selected && (
        <ShipmentDrawer shipment={selected} onClose={() => setSelected(null)} onUpdated={load} />
      )}
    </div>
  );
}
