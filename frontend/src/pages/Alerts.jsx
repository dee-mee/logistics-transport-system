import { useState, useEffect } from 'react';
import { AlertTriangle, Clock, MapPin, Wrench } from 'lucide-react';
import client from '../api/client';

const AlertCard = ({ alert }) => {
  const getSeverityColor = (severity) => {
    const colors = {
      'critical': 'bg-red-100 border-red-500 text-red-800',
      'high': 'bg-orange-100 border-orange-500 text-orange-800',
      'medium': 'bg-yellow-100 border-yellow-500 text-yellow-800',
      'low': 'bg-blue-100 border-blue-500 text-blue-800',
    };
    return colors[severity] || colors['low'];
  };

  const getIcon = (type) => {
    const icons = {
      'dashboard': AlertTriangle,
      'gps': MapPin,
      'maintenance': Wrench,
    };
    const Icon = icons[type] || AlertTriangle;
    return <Icon size={16} />;
  };

  return (
    <div className={`p-4 rounded-lg border-l-4 ${getSeverityColor(alert.severity)} mb-3 bg-white`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{getIcon(alert.type)}</div>
        <div className="flex-1">
          <div className="font-medium text-sm text-gray-900">{alert.title}</div>
          <div className="text-sm text-gray-600 mt-1">{alert.message}</div>
          {alert.related_vehicle && (
            <div className="text-sm mt-1 font-medium text-gray-800">Vehicle: {alert.related_vehicle}</div>
          )}
        </div>
        <div className="text-sm text-gray-500">
          {new Date(alert.created_at).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};

const Alerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await client.get('/dashboard/metrics/alerts/');
      setAlerts(response.data || []);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      setError('Failed to load alerts');
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-gray-900 mb-1">Alerts</h1>
          <p className="text-sm text-gray-600">Active system alerts and notifications</p>
        </div>
        <button
          onClick={fetchAlerts}
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
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-800 mb-2">Error Loading Alerts</h3>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchAlerts}
            className="px-4 py-2 bg-teal text-white rounded-lg text-sm font-medium hover:bg-teal/90"
          >
            Retry
          </button>
        </div>
      ) : alerts.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-800 mb-2">No Active Alerts</h3>
          <p className="text-sm text-gray-600">Everything is running smoothly. Check back later for any alerts.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Alerts;