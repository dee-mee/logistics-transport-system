import { useState, useEffect } from 'react';
import { Fuel as FuelIcon, TrendingUp, Calendar } from 'lucide-react';
import client from '../api/client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const FuelManagement = () => {
  const [fuelTrend, setFuelTrend] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFuelData();
  }, []);

  const fetchFuelData = async () => {
    try {
      setLoading(true);
      const response = await client.get('/dashboard/fuel_trend/');
      setFuelTrend(response.data);
    } catch (error) {
      console.error('Error fetching fuel data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink mb-1">Fuel Management</h1>
          <p className="text-sm text-ink-700/60">Fuel consumption trends and analytics</p>
        </div>
        <button
          onClick={fetchFuelData}
          className="px-4 py-2 bg-teal text-white rounded-lg text-sm font-medium hover:bg-teal/90 transition-colors flex items-center gap-2"
        >
          <Calendar size={16} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal"></div>
        </div>
      ) : (
        <div className="bg-white border border-line rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <FuelIcon className="w-5 h-5 text-teal" />
            <h3 className="font-medium text-ink">Fuel Consumption Trend (30 Days)</h3>
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