import { useEffect, useState } from "react";
import client from "../api/client";
import StatusBadge from "../components/StatusBadge";
import ManifestTag from "../components/ManifestTag";

export default function Trips() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.get("/dispatch/trips/")
      .then((res) => setTrips(res.data.results ?? res.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink mb-1">Trips</h1>
      <p className="text-sm text-ink-700/60 mb-6">Vehicle + driver runs, each covering one or more shipments.</p>

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
              </tr>
            </thead>
            <tbody>
              {trips.map((t) => (
                <tr key={t.id} className="border-b border-line last:border-0">
                  <td className="px-5 py-3"><ManifestTag>{t.reference}</ManifestTag></td>
                  <td className="px-5 py-3 text-ink-700">{t.vehicle_plate}</td>
                  <td className="px-5 py-3 text-ink-700">{t.driver_name}</td>
                  <td className="px-5 py-3 text-ink-700">{t.stops?.length ?? 0}</td>
                  <td className="px-5 py-3"><StatusBadge status={t.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
