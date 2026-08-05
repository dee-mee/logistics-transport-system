import { useEffect, useState } from "react";
import { Play, CheckCircle, X, MapPin, Clock, User, Truck } from "lucide-react";
import client from "../api/client";
import StatusBadge from "../components/StatusBadge";
import ManifestTag from "../components/ManifestTag";
import { useAuth } from "../context/AuthContext";

const STATUS_OPTIONS = ["planned", "dispatched", "in_progress", "completed", "cancelled"];

function TripDrawer({ trip, onClose }) {
  const [stops, setStops] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (trip) {
      setLoading(true);
      client.get(`/dispatch/trip-stops/?trip=${trip.id}`)
        .then((res) => {
          console.log('Trip stops:', res.data);
          setStops(res.data.results ?? res.data);
        })
        .catch((error) => {
          console.error('Error loading trip stops:', error);
          setStops([]);
        })
        .finally(() => setLoading(false));
    }
  }, [trip]);

  return (
    <div className="fixed inset-0 bg-ink/40 flex justify-end z-50">
      <div className="bg-white w-full max-w-md h-full overflow-y-auto shadow-2xl">
        <div className="px-6 py-4 border-b border-line flex items-center justify-between sticky top-0 bg-white z-10">
          <ManifestTag>{trip.reference}</ManifestTag>
          <button onClick={onClose} className="text-ink-700/50 hover:text-ink"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-ink">Trip Details</h3>
              <StatusBadge status={trip.status} />
            </div>
            <dl className="text-sm space-y-2">
              <div className="flex justify-between">
                <dt className="text-ink-700/60">Driver</dt>
                <dd className="text-right">{trip.driver_name || 'Not assigned'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-700/60">Vehicle</dt>
                <dd className="text-right">{trip.vehicle_plate || 'Not assigned'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-700/60">Scheduled Start</dt>
                <dd className="text-right">
                  {trip.scheduled_start ? new Date(trip.scheduled_start).toLocaleString() : 'Not set'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-700/60">Actual Start</dt>
                <dd className="text-right">
                  {trip.actual_start ? new Date(trip.actual_start).toLocaleString() : 'Not started'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-700/60">Actual End</dt>
                <dd className="text-right">
                  {trip.actual_end ? new Date(trip.actual_end).toLocaleString() : 'Not completed'}
                </dd>
              </div>
              {trip.notes && (
                <div className="flex justify-between">
                  <dt className="text-ink-700/60">Notes</dt>
                  <dd className="text-right">{trip.notes}</dd>
                </div>
              )}
            </dl>
          </div>

          <div className="border-t border-line pt-4">
            <h3 className="font-medium text-ink mb-3">Trip Stops</h3>
            {loading ? (
              <div className="text-sm text-ink-700/50">Loading stops…</div>
            ) : stops.length === 0 ? (
              <div className="text-sm text-ink-700/50">No stops recorded</div>
            ) : (
              <div className="space-y-3">
                {stops.map((stop, index) => (
                  <div key={stop.id} className="flex gap-3 items-start">
                    <div className="w-8 h-8 rounded-full bg-teal-light text-teal flex items-center justify-center text-sm font-medium shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1 text-sm">
                      <div className="font-medium text-ink">
                        {stop.stop_type === 'pickup' ? '🚩 Pickup' : '🏁 Dropoff'}
                      </div>
                      <div className="text-ink-700/70">{stop.shipment_tracking_code}</div>
                      {stop.notes && <p className="text-ink-700/50 text-xs mt-1">{stop.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-line pt-4">
            <h3 className="font-medium text-ink mb-3">Route Summary</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-ink-700/60 text-xs">Total Stops</div>
                <div className="font-medium text-ink">{stops.length}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-ink-700/60 text-xs">Status</div>
                <div className="font-medium capitalize text-ink">{trip.status.replace(/_/g, ' ')}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Trips() {
  const { user } = useAuth();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedTrip, setSelectedTrip] = useState(null);

  useEffect(() => {
    loadTrips();
  }, [statusFilter, user]);

  function loadTrips() {
    setLoading(true);
    
    // Build query parameters
    let queryParams = [];
    if (statusFilter) {
      queryParams.push(`status=${statusFilter}`);
    }
    
    const q = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
    
    client.get(`/dispatch/trips/${q}`)
      .then((res) => {
        console.log('Trips response:', res.data);
        setTrips(res.data.results ?? res.data);
      })
      .catch((error) => {
        console.error('Error loading trips:', error);
        setTrips([]);
      })
      .finally(() => setLoading(false));
  }

  const startTrip = async (tripId) => {
    setActionLoading(tripId);
    try {
      await client.post(`/dispatch/trips/${tripId}/start/`);
      // Refresh trips
      loadTrips();
    } catch (error) {
      console.error("Error starting trip:", error);
      alert(error.response?.data?.error || "Failed to start trip");
    } finally {
      setActionLoading(null);
    }
  };

  const finishTrip = async (tripId) => {
    setActionLoading(tripId);
    try {
      await client.post(`/dispatch/trips/${tripId}/finish/`);
      // Refresh trips
      loadTrips();
    } catch (error) {
      console.error("Error finishing trip:", error);
      alert(error.response?.data?.error || "Failed to finish trip");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink mb-1">Trips</h1>
          <p className="text-sm text-ink-700/60">Vehicle + driver runs, each covering one or more shipments.</p>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-line rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
          ))}
        </select>
      </div>

      <div className="bg-white border border-line rounded-xl overflow-hidden">
        {loading ? (
          <div className="px-5 py-8 text-center text-sm text-ink-700/50">Loading…</div>
        ) : trips.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-ink-700/50">
            No trips yet. Trips are created once shipments are assigned to a vehicle and driver.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-ink-700/50">
                <th className="px-5 py-3 font-medium">Reference</th>
                <th className="px-5 py-3 font-medium">Vehicle</th>
                <th className="px-5 py-3 font-medium">Driver</th>
                <th className="px-5 py-3 font-medium">Stops</th>
                <th className="px-5 py-3 font-medium">Status</th>
                {user?.role === 'driver' && (
                  <th className="px-5 py-3 font-medium">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {trips.map((t) => (
                <tr 
                  key={t.id} 
                  className="border-b border-line last:border-0 hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedTrip(t)}
                >
                  <td className="px-5 py-3"><ManifestTag>{t.reference}</ManifestTag></td>
                  <td className="px-5 py-3 text-ink-700">{t.vehicle_plate || 'Not assigned'}</td>
                  <td className="px-5 py-3 text-ink-700">{t.driver_name}</td>
                  <td className="px-5 py-3 text-ink-700">{t.stops?.length ?? 0}</td>
                  <td className="px-5 py-3"><StatusBadge status={t.status} /></td>
                  {user?.role === 'driver' && (
                    <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                      {t.status === 'planned' && (
                        <button
                          onClick={() => startTrip(t.id)}
                          disabled={actionLoading === t.id}
                          className="flex items-center gap-1 bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 disabled:opacity-50"
                        >
                          <Play size={14} />
                          {actionLoading === t.id ? 'Starting...' : 'Start'}
                        </button>
                      )}
                      {t.status === 'in_progress' && (
                        <button
                          onClick={() => finishTrip(t.id)}
                          disabled={actionLoading === t.id}
                          className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                        >
                          <CheckCircle size={14} />
                          {actionLoading === t.id ? 'Finishing...' : 'Finish'}
                        </button>
                      )}
                      {t.status === 'completed' && (
                        <span className="text-sm text-gray-500">Completed</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      
      {selectedTrip && (
        <TripDrawer trip={selectedTrip} onClose={() => setSelectedTrip(null)} />
      )}
    </div>
  );
}
