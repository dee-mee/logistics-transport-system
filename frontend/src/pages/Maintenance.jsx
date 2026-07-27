import { useState, useEffect } from 'react';
import { Wrench, Calendar, Clock } from 'lucide-react';
import client from '../api/client';

const Maintenance = () => {
  const [upcomingMaintenance, setUpcomingMaintenance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchMaintenanceData();
  }, []);

  const fetchMaintenanceData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await client.get('/fleet/maintenance-records/upcoming/');
      setUpcomingMaintenance(response.data || []);
    } catch (error) {
      console.error('Error fetching maintenance data:', error);
      setError('Failed to load maintenance data');
      setUpcomingMaintenance([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-gray-900 mb-1">Maintenance</h1>
          <p className="text-sm text-gray-600">Upcoming maintenance schedules and history</p>
        </div>
        <button
          onClick={fetchMaintenanceData}
          className="px-4 py-2 bg-teal text-white rounded-lg text-sm font-medium hover:bg-teal/90 transition-colors flex items-center gap-2"
        >
          <Clock size={16} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal"></div>
        </div>
      ) : error ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <Wrench className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-800 mb-2">Error Loading Maintenance Data</h3>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchMaintenanceData}
            className="px-4 py-2 bg-teal text-white rounded-lg text-sm font-medium hover:bg-teal/90"
          >
            Retry
          </button>
        </div>
      ) : upcomingMaintenance.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <Wrench className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-800 mb-2">No Upcoming Maintenance</h3>
          <p className="text-sm text-gray-600">All vehicles are up to date with their maintenance schedules.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-teal" />
              <h2 className="font-medium text-gray-900">Upcoming Maintenance</h2>
            </div>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
              {upcomingMaintenance.length}
            </span>
          </div>
          <div className="p-5">
            <div className="space-y-3">
              {upcomingMaintenance.map((maintenance) => (
                <div key={maintenance.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center">
                      <Wrench size={20} />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{maintenance.vehicle?.plate_number || 'Unknown Vehicle'}</div>
                      <div className="text-sm text-gray-600">{maintenance.get_maintenance_type_display()}</div>
                      {maintenance.description && (
                        <div className="text-xs text-gray-500 mt-1">{maintenance.description}</div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                      <Calendar size={16} />
                      {new Date(maintenance.scheduled_date).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{maintenance.priority}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Maintenance;