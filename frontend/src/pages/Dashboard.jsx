import { useEffect, useState } from "react";
import { Package, Truck, Users, Route, DollarSign, Clock, TrendingUp, Activity } from "lucide-react";
import client from "../api/client";
import StatusBadge from "../components/StatusBadge";
import ManifestTag from "../components/ManifestTag";
import { Link } from "react-router-dom";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

function StatCard({ icon: Icon, label, value, trend, trendUp }) {
  return (
    <div className="bg-white border border-line rounded-xl px-5 py-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-lg bg-teal-light text-teal flex items-center justify-center shrink-0">
        <Icon size={18} />
      </div>
      <div className="flex-1">
        <div className="text-2xl font-display font-semibold text-ink leading-none">{value}</div>
        <div className="text-xs text-ink-700/60 mt-1">{label}</div>
        {trend && (
          <div className={`text-xs mt-1 flex items-center gap-1 ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
            <TrendingUp size={12} />
            {trend}% from last week
          </div>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState({ 
    shipments: 0, vehicles: 0, drivers: 0, trips: 0, 
    revenue: 0, onTimeRate: 0 
  });
  const [recentShipments, setRecentShipments] = useState([]);
  const [vehicleStatus, setVehicleStatus] = useState([]);
  const [shipmentStatus, setShipmentStatus] = useState([]);
  const [shipmentTrend, setShipmentTrend] = useState([]);
  const [weeklyPerformance, setWeeklyPerformance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    // Refresh data every 60 seconds
    const interval = setInterval(fetchDashboardData, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [
        shipmentsRes, vehiclesRes, driversRes, tripsRes,
        vehicleStatusRes, shipmentStatusRes, shipmentTrendRes,
        weeklyPerformanceRes
      ] = await Promise.all([
        client.get("/orders/shipments/?page_size=5"),
        client.get("/fleet/vehicles/"),
        client.get("/fleet/drivers/"),
        client.get("/dispatch/trips/"),
        client.get("/dashboard/metrics/vehicle_status/"),
        client.get("/dashboard/metrics/shipment_status/"),
        client.get("/dashboard/metrics/shipment_trend/"),
        client.get("/dashboard/metrics/weekly_performance/"),
      ]);

      setStats({
        shipments: shipmentsRes.data.count ?? shipmentsRes.data.length,
        vehicles: vehiclesRes.data.count ?? vehiclesRes.data.length,
        drivers: driversRes.data.count ?? driversRes.data.length,
        trips: tripsRes.data.count ?? tripsRes.data.length,
        revenue: 15420, // Placeholder - would come from real data
        onTimeRate: 94.5, // Placeholder - would come from real data
      });
      setRecentShipments((shipmentsRes.data.results ?? shipmentsRes.data).slice(0, 5));
      setVehicleStatus(vehicleStatusRes.data);
      setShipmentStatus(shipmentStatusRes.data);
      setShipmentTrend(shipmentTrendRes.data);
      setWeeklyPerformance(weeklyPerformanceRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink mb-1">Dashboard</h1>
          <p className="text-sm text-ink-700/60">Real-time fleet operations overview</p>
        </div>
        <button
          onClick={fetchDashboardData}
          className="px-4 py-2 bg-teal text-white rounded-lg text-sm font-medium hover:bg-teal/90 transition-colors flex items-center gap-2"
        >
          <Activity size={16} />
          Refresh
        </button>
      </div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-6 gap-4 mb-6">
        <StatCard icon={Truck} label="Total Vehicles" value={stats.vehicles} trend={12} trendUp={true} />
        <StatCard icon={Route} label="Active Trips" value={stats.trips} trend={8} trendUp={true} />
        <StatCard icon={Package} label="Pending Shipments" value={stats.shipments} trend={-3} trendUp={false} />
        <StatCard icon={Users} label="Available Drivers" value={stats.drivers} trend={5} trendUp={true} />
        <StatCard icon={DollarSign} label="Today's Revenue" value={`$${stats.revenue.toLocaleString()}`} trend={15} trendUp={true} />
        <StatCard icon={Clock} label="On-Time Rate" value={`${stats.onTimeRate}%`} trend={2} trendUp={true} />
      </div>

      {/* Status Charts */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-white border border-line rounded-xl p-5">
          <h3 className="font-medium text-ink mb-4">Vehicle Status Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={vehicleStatus}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={60}
                fill="#8884d8"
                dataKey="count"
              >
                {vehicleStatus.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border border-line rounded-xl p-5">
          <h3 className="font-medium text-ink mb-4">Shipment Status</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={shipmentStatus}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={60}
                fill="#8884d8"
                dataKey="count"
              >
                {shipmentStatus.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Trend Charts */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-white border border-line rounded-xl p-5">
          <h3 className="font-medium text-ink mb-4">Shipments Trend (30 Days)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={shipmentTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" tick={{fontSize: 12}} />
              <YAxis tick={{fontSize: 12}} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#0088FE" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border border-line rounded-xl p-5">
          <h3 className="font-medium text-ink mb-4">Weekly Performance</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeklyPerformance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{fontSize: 12}} />
              <YAxis tick={{fontSize: 12}} />
              <Tooltip />
              <Legend />
              <Bar dataKey="completed_shipments" fill="#00C49F" name="Completed" />
              <Bar dataKey="active_trips" fill="#0088FE" name="Active Trips" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Activity Feed */}
      <div className="bg-white border border-line rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-line flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-teal" />
            <h2 className="font-medium text-ink">Recent Activity</h2>
          </div>
          <Link to="/shipments" className="text-sm text-teal font-medium hover:underline">
            View All →
          </Link>
        </div>
        <div className="p-5">
          {recentShipments.length === 0 ? (
            <div className="text-center text-sm text-ink-700/50 py-8">
              No recent activity
            </div>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {recentShipments.map((s) => (
                  <tr key={s.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3"><ManifestTag>{s.tracking_code}</ManifestTag></td>
                    <td className="px-4 py-3 text-ink-700">{s.pickup_address} → {s.dropoff_address}</td>
                    <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                    <td className="px-4 py-3 text-xs text-ink-700/50">
                      {new Date(s.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}