import { useState, useEffect } from 'react';
import { Fuel as FuelIcon, TrendingUp, Calendar } from 'lucide-react';
import client from '../api/client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const FuelManagement = () => {
  const [fuelTrend, setFuelTrend] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchFuelData();
  }, []);

  const fetchFuelData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await client.get('/dashboard/metrics/fuel-trend/');
      setFuelTrend(response.data || []);
    } catch (error) {
      console.error('Error fetching fuel data:', error);
      setError('Failed to load fuel data');
      setFuelTrend([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-gray-900 mb-1">Fuel Management</h1>
          <p className="text-sm text-gray-600">Fuel consumption trends and analytics</p>
        </div>
        <button
          onClick={fetchFuelData}
          className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors flex items-center gap-2"
        >
          <Calendar size={16} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
        </div>
      ) : error ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <FuelIcon className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-800 mb-2">Error Loading Fuel Data</h3>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchFuelData}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700"
          >
            Retry
          </button>
        </div>
      ) : fuelTrend.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <FuelIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-800 mb-2">No Fuel Data Available</h3>
          <p className="text-sm text-gray-600">No fuel consumption data has been recorded yet.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <FuelIcon className="w-5 h-5 text-teal-600" />
            <h3 className="font-medium text-gray-900">Fuel Consumption Trend (30 Days)</h3>
          </div>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={fuelTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" tick={{fontSize: 12}} />
              <YAxis tick={{fontSize: 12}} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="total_liters" stroke="#00C49F" strokeWidth={2} name="Liters" />
              <Line type="monotone" dataKey="total_cost" stroke="#FF8042" strokeWidth={2} name="Cost ($)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default FuelManagement;