import { useEffect, useState } from "react";
import { Play, CheckCircle } from "lucide-react";
import client from "../api/client";
import StatusBadge from "../components/StatusBadge";
import ManifestTag from "../components/ManifestTag";
import { useAuth } from "../context/AuthContext";

const STATUS_OPTIONS = ["planned", "dispatched", "in_progress", "completed", "cancelled"];

export default function Trips() {
  const { user } = useAuth();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");

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
                <tr key={t.id} className="border-b border-line last:border-0">
                  <td className="px-5 py-3"><ManifestTag>{t.reference}</ManifestTag></td>
                  <td className="px-5 py-3 text-ink-700">{t.vehicle_plate || 'Not assigned'}</td>
                  <td className="px-5 py-3 text-ink-700">{t.driver_name}</td>
                  <td className="px-5 py-3 text-ink-700">{t.stops?.length ?? 0}</td>
                  <td className="px-5 py-3"><StatusBadge status={t.status} /></td>
                  {user?.role === 'driver' && (
                    <td className="px-5 py-3">
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
    </div>
  );
}
