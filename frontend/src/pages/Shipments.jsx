import { useEffect, useState } from "react";
import { Plus, X, MapPin, User, Truck, Play, Map } from "lucide-react";
import client from "../api/client";
import StatusBadge from "../components/StatusBadge";
import ManifestTag from "../components/ManifestTag";
import LocationPicker from "../components/LocationPicker";
import DriverTracking from "../components/DriverTracking";
import { useAuth } from "../context/AuthContext";

const STATUS_OPTIONS = ["pending", "confirmed", "assigned", "in_transit", "delivered", "cancelled", "failed"];

function CreateShipmentModal({ onClose, onCreated }) {
  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [form, setForm] = useState({
    customer: "", pickup_address: "", dropoff_address: "", weight_kg: "", priority: "standard", price: "",
    pickup_lat: null, pickup_lng: null, dropoff_lat: null, dropoff_lng: null,
  });
  const [newCustomer, setNewCustomer] = useState({ contact_name: "", contact_phone: "", company_name: "" });
  const [useNewCustomer, setUseNewCustomer] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setLoadingCustomers(true);
    client.get("/orders/customers/").then((res) => {
      console.log('Customers loaded:', res.data.results ?? res.data);
      setCustomers(res.data.results ?? res.data);
    }).catch((err) => {
      console.error('Error loading customers:', err);
      setCustomers([]);
    }).finally(() => {
      setLoadingCustomers(false);
    });
    client.get("/fleet/drivers/").then((res) => {
      console.log('Drivers loaded:', res.data.results ?? res.data);
    }).catch((err) => {
      console.error('Error loading drivers:', err);
    });
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
      
      // Debug logging
      console.log('Form state before submission:', form);
      console.log('Pickup address:', form.pickup_address);
      console.log('Dropoff address:', form.dropoff_address);
      
      // Validate required fields
      if (!form.pickup_address || form.pickup_address.trim() === '') {
        setError("Pickup address is required");
        setBusy(false);
        return;
      }
      if (!form.dropoff_address || form.dropoff_address.trim() === '') {
        setError("Dropoff address is required");
        setBusy(false);
        return;
      }
      
      // Round coordinates to 6 decimal places
      const roundTo6Decimals = (value) => {
        if (value === null || value === undefined || value === '') return null;
        const num = parseFloat(value);
        if (isNaN(num)) return null;
        return Math.round(num * 1000000) / 1000000;
      };
      
      const shipmentData = {
        customer: customerId,
        pickup_address: form.pickup_address.trim(),
        dropoff_address: form.dropoff_address.trim(),
        weight_kg: parseFloat(form.weight_kg) || 0,
        priority: form.priority || 'standard',
        price: form.price !== "" ? parseFloat(form.price) : null,
        pickup_lat: roundTo6Decimals(form.pickup_lat),
        pickup_lng: roundTo6Decimals(form.pickup_lng),
        dropoff_lat: roundTo6Decimals(form.dropoff_lat),
        dropoff_lng: roundTo6Decimals(form.dropoff_lng)
      };
      
      console.log('Shipment data to send:', shipmentData);
      
      await client.post("/orders/shipments/", shipmentData);
      onCreated();
    } catch (err) {
      console.error('Error creating shipment:', err);
      const errorMessage = err.response?.data?.detail || err.response?.data?.error || 
                          Object.values(err.response?.data || {}).flat().join(', ') ||
                          "Couldn't create that shipment — check the fields and try again.";
      setError(errorMessage);
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
                className="w-full border border-line rounded-lg px-3 py-2 text-sm" disabled={loadingCustomers}>
                <option value="">Select a customer…</option>
                {loadingCustomers ? (
                  <option value="" disabled>Loading customers…</option>
                ) : customers.length === 0 ? (
                  <option value="" disabled>No customers available</option>
                ) : (
                  customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.company_name || c.contact_name}</option>
                  ))
                )}
              </select>
            )}
          </div>

          <div>
            <LocationPicker
              label="Pickup address"
              value={form.pickup_address}
              onChange={(value) => {
                console.log('Pickup address changed:', value);
                console.log('Current form state before update:', form);
                setForm({ ...form, pickup_address: value });
                console.log('Form state after pickup address update');
              }}
              onCoordinatesChange={(coords) => {
                console.log('Pickup coordinates changed:', coords);
                setForm({ ...form, pickup_lat: coords.lat, pickup_lng: coords.lng });
              }}
            />
          </div>
          <div>
            <LocationPicker
              label="Dropoff address"
              value={form.dropoff_address}
              onChange={(value) => {
                console.log('Dropoff address changed:', value);
                console.log('Current form state before update:', form);
                setForm({ ...form, dropoff_address: value });
                console.log('Form state after dropoff address update');
              }}
              onCoordinatesChange={(coords) => {
                console.log('Dropoff coordinates changed:', coords);
                setForm({ ...form, dropoff_lat: coords.lat, dropoff_lng: coords.lng });
              }}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
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
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">Price ($)</label>
              <input type="number" step="0.01" min="0" value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="Optional"
                className="w-full border border-line rounded-lg px-3 py-2 text-sm" />
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
  const [scheduledTime, setScheduledTime] = useState("");
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

  // Helper to check if a vehicle is busy
  const isVehicleBusy = (vehicleId) => {
    return activeShipments.some(s => s.vehicle === vehicleId && s.id !== shipment.id);
  };

  // Helper to get the busy vehicle's active shipment
  const getVehicleActiveShipment = (vehicleId) => {
    return activeShipments.find(s => s.vehicle === vehicleId && s.id !== shipment.id);
  };

  async function addEvent(e) {
    e.preventDefault();
    if (!newStatus) return;
    setBusy(true);
    try {
      // Update the shipment status directly
      await client.patch(`/orders/shipments/${shipment.id}/`, { 
        status: newStatus
      });
      
      // Also create a status event for tracking history
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
      const errorMessage = err.response?.data?.detail || err.response?.data?.error || 
                          Object.values(err.response?.data || {}).flat().join(', ') ||
                          "Failed to update shipment status";
      alert(errorMessage);
    } finally {
      setBusy(false);
    }
  }

  async function assignDriver() {
    if (!selectedDriver) return;
    setBusy(true);
    try {
      const payload = {
        driver_id: selectedDriver,
        vehicle_id: selectedVehicle || null
      };
      
      // Add scheduled time if provided
      if (scheduledTime) {
        payload.scheduled_start = scheduledTime;
      }
      
      const response = await client.post(`/orders/shipments/${shipment.id}/assign_driver/`, payload);
      setShowAssignDriver(false);
      setSelectedDriver("");
      setSelectedVehicle("");
      setScheduledTime("");
      // Call onUpdated to refresh the list
      onUpdated();
      // Also fetch the updated shipment data
      const updatedShipment = await client.get(`/orders/shipments/${shipment.id}/`);
      // Update the local shipment object with the response
      Object.assign(shipment, updatedShipment.data);
      // Force a re-render by updating a dummy state
      setEvents([...events]);
    } catch (err) {
      console.error(err);
      // Handle busy driver/vehicle error specifically
      if (err.response?.data?.driver_status === 'busy') {
        const activeShipments = err.response.data.active_shipments?.join(', ') || '';
        alert(`Driver is busy with active shipment(s): ${activeShipments}`);
      } else if (err.response?.data?.vehicle_status === 'busy') {
        const activeShipments = err.response.data.active_shipments?.join(', ') || '';
        alert(`Vehicle is busy with active shipment(s): ${activeShipments}`);
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
      console.log('Starting tracking for shipment:', shipment.id, 'Status:', shipment.status, 'Driver:', shipment.driver);
      
      // If already in_transit, just show a message
      if (shipment.status === 'in_transit') {
        alert('Tracking is already active for this shipment');
        setBusy(false);
        return;
      }
      
      const response = await client.post(`/orders/shipments/${shipment.id}/start_tracking/`);
      
      onUpdated();
      // Fetch updated shipment data
      const updatedShipment = await client.get(`/orders/shipments/${shipment.id}/`);
      Object.assign(shipment, updatedShipment.data);
      setEvents([...events]);
    } catch (err) {
      console.error('Error starting tracking:', err);
      const errorMessage = err.response?.data?.error || err.response?.data?.detail || 
                          "Failed to start tracking. Please ensure the shipment has a driver assigned and is in 'assigned' status.";
      alert(errorMessage);
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
              <div className="flex justify-between"><dt className="text-ink-700/60">Price</dt><dd>{shipment.price != null ? `$${Number(shipment.price).toLocaleString()}` : '—'}</dd></div>
              {shipment.driver_name && (
                <div className="flex justify-between"><dt className="text-ink-700/60">Driver</dt><dd className="text-right">{shipment.driver_name}</dd></div>
              )}
              {shipment.driver_details && (
                <div className="flex justify-between"><dt className="text-ink-700/60">Driver</dt><dd className="text-right">{shipment.driver_details.user_first_name} {shipment.driver_details.user_last_name}</dd></div>
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
                        const displayName = driver.user_first_name && driver.user_last_name 
                          ? `${driver.user_first_name} ${driver.user_last_name}`
                          : driver.user_username || driver.user_name || 'Unknown';
                        return (
                          <option 
                            key={driver.id} 
                            value={driver.id}
                            disabled={busy}
                          >
                            {displayName} ({driver.license_number})
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
                      {vehicles.map((vehicle) => {
                        const busy = isVehicleBusy(vehicle.id);
                        return (
                          <option 
                            key={vehicle.id} 
                            value={vehicle.id}
                            disabled={busy}
                          >
                            {vehicle.plate_number} - {vehicle.make} {vehicle.model}
                            {busy ? ' - Busy' : ''}
                          </option>
                        );
                      })}
                    </select>
                    {selectedVehicle && isVehicleBusy(selectedVehicle) && (
                      <div className="text-xs text-rust bg-rust-light rounded-lg px-3 py-2">
                        This vehicle is currently busy with shipment: {getVehicleActiveShipment(selectedVehicle)?.tracking_code}
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-ink-700 mb-1.5">Scheduled Start Time (optional)</label>
                      <input 
                        type="datetime-local" 
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        className="w-full border border-line rounded-lg px-3 py-2 text-sm"
                      />
                      <p className="text-xs text-ink-700/50 mt-1">Leave empty for default (1 hour from now)</p>
                    </div>
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
                {shipment.driver_details && (
                  <div className="text-xs text-gray-500">
                    License: {shipment.driver_details.license_number}
                  </div>
                )}
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
                {shipment.status === 'in_transit' && (
                  <div className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium">
                    <Map size={16} />
                    Tracking Active
                  </div>
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
    
    // Build query parameters based on user role and filter
    let queryParams = [];
    
    // Include delivered shipments when filtering by status or when explicitly requested
    if (statusFilter) {
      queryParams.push(`status=${statusFilter}`);
      queryParams.push('include_delivered=true');
    } else {
      // Default view: only show non-delivered shipments (active view)
      queryParams.push('exclude_delivered=true');
    }
    
    const q = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
    
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
          Active
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
                <th className="px-5 py-3 font-medium">Price</th>
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
                  <td className="px-5 py-3 text-ink-700">{s.price != null ? `$${Number(s.price).toLocaleString()}` : '—'}</td>
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
