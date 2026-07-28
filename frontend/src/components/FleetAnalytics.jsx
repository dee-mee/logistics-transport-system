import { useState, useEffect } from 'react';
import { BarChart, Bar, PieChart, Pie, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import client from '../api/client';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

function FleetAnalytics() {
  const [vehicleAnalytics, setVehicleAnalytics] = useState(null);
  const [driverAnalytics, setDriverAnalytics] = useState(null);
  const [maintenanceAnalytics, setMaintenanceAnalytics] = useState(null);
  const [utilization, setUtilization] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
    // Refresh data every 60 seconds
    const interval = setInterval(loadAnalytics, 60000);
    return () => clearInterval(interval);
  }, []);

  async function loadAnalytics() {
    try {
      const [vehicleRes, driverRes, maintenanceRes, utilizationRes] = await Promise.all([
        client.get("/fleet/vehicles/analytics/").catch(() => ({ data: null })),
        client.get("/fleet/drivers/analytics/").catch(() => ({ data: null })),
        client.get("/fleet/maintenance-records/analytics/").catch(() => ({ data: null })),
        client.get("/fleet/vehicles/utilization/").catch(() => ({ data: null })),
      ]);

      setVehicleAnalytics(vehicleRes.data);
      setDriverAnalytics(driverRes.data);
      setMaintenanceAnalytics(maintenanceRes.data);
      setUtilization(utilizationRes.data);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1e3a8a]"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Fleet Analytics</h2>
          <p className="text-sm text-gray-500">Comprehensive fleet performance metrics and trends</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-gray-200 p-4">
          <div className="text-sm text-gray-500 mb-1">Total Vehicles</div>
          <div className="text-2xl font-bold text-gray-900">{vehicleAnalytics?.total_vehicles || 0}</div>
        </div>
        <div className="bg-white border border-gray-200 p-4">
          <div className="text-sm text-gray-500 mb-1">Total Drivers</div>
          <div className="text-2xl font-bold text-gray-900">{driverAnalytics?.total_drivers || 0}</div>
        </div>
        <div className="bg-white border border-gray-200 p-4">
          <div className="text-sm text-gray-500 mb-1">Fleet Value</div>
          <div className="text-2xl font-bold text-gray-900">${vehicleAnalytics?.total_fleet_value?.toLocaleString() || 0}</div>
        </div>
        <div className="bg-white border border-gray-200 p-4">
          <div className="text-sm text-gray-500 mb-1">Utilization Rate</div>
          <div className="text-2xl font-bold text-gray-900">{utilization?.utilization_rate || 0}%</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Vehicle Status Distribution */}
        <div className="bg-white border border-gray-200 p-5">
          <h3 className="font-medium text-gray-900 mb-4">Vehicle Status Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={vehicleAnalytics?.status_distribution || []}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {(vehicleAnalytics?.status_distribution || []).map((entry, index) => (
                  <Pie.Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Vehicle Type Distribution */}
        <div className="bg-white border border-gray-200 p-5">
          <h3 className="font-medium text-gray-900 mb-4">Vehicle Type Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={vehicleAnalytics?.type_distribution || []}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {(vehicleAnalytics?.type_distribution || []).map((entry, index) => (
                  <Pie.Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Maintenance Analytics */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-white border border-gray-200 p-5">
          <h3 className="font-medium text-gray-900 mb-4">Maintenance Cost Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={maintenanceAnalytics?.monthly_trend || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{fontSize: 12}} />
              <YAxis tick={{fontSize: 12}} />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#0088FE" name="Count" />
              <Bar dataKey="total_cost" fill="#00C49F" name="Cost" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border border-gray-200 p-5">
          <h3 className="font-medium text-gray-900 mb-4">Maintenance Type Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={maintenanceAnalytics?.type_distribution || []}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {(maintenanceAnalytics?.type_distribution || []).map((entry, index) => (
                  <Pie.Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Driver Performance */}
      <div className="bg-white border border-gray-200 p-5">
        <h3 className="font-medium text-gray-900 mb-4">Driver Performance Overview</h3>
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-gray-50 p-4">
            <div className="text-sm text-gray-500 mb-1">Average Safety Score</div>
            <div className="text-xl font-bold text-gray-900">{driverAnalytics?.average_safety_score || 0}/10</div>
          </div>
          <div className="bg-gray-50 p-4">
            <div className="text-sm text-gray-500 mb-1">On-Time Performance</div>
            <div className="text-xl font-bold text-gray-900">{driverAnalytics?.average_on_time_performance || 0}%</div>
          </div>
          <div className="bg-gray-50 p-4">
            <div className="text-sm text-gray-500 mb-1">Total Distance Driven</div>
            <div className="text-xl font-bold text-gray-900">{Math.round(driverAnalytics?.total_distance_driven || 0).toLocaleString()} km</div>
          </div>
          <div className="bg-gray-50 p-4">
            <div className="text-sm text-gray-500 mb-1">Average Vehicle Age</div>
            <div className="text-xl font-bold text-gray-900">{vehicleAnalytics?.average_vehicle_age || 0} years</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FleetAnalytics;