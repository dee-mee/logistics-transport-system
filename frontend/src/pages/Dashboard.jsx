import { useEffect, useState } from "react";
import { Package, Truck, Users, Route, MapPin, DollarSign, Clock, AlertTriangle, Wrench, TrendingUp, Activity, Fuel } from "lucide-react";
import client from "../api/client";
import StatusBadge from "../components/StatusBadge";
import ManifestTag from "../components/ManifestTag";
import LiveFleetMap from "../components/LiveFleetMap";
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

function AlertCard({ alert }) {
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
    <div className={`p-3 rounded-lg border-l-4 ${getSeverityColor(alert.severity)} mb-2`}>
      <div className="flex items-start gap-2">
        <div className="mt-0.5">{getIcon(alert.type)}</div>
        <div className="flex-1">
          <div className="font-medium text-sm">{alert.title}</div>
          <div className="text-xs opacity-80 mt-1">{alert.message}</div>
          {alert.related_vehicle && (
            <div className="text-xs mt-1 font-medium">Vehicle: {alert.related_vehicle}</div>
          )}
        </div>
        <div className="text-xs opacity-60">
          {new Date(alert.created_at).toLocaleTimeString()}
        </div>
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
  const [alerts, setAlerts] = useState([]);
  const [fuelTrend, setFuelTrend] = useState([]);
  const [upcomingMaintenance, setUpcomingMaintenance] = useState([]);
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
        weeklyPerformanceRes, alertsRes, fuelTrendRes, maintenanceRes
      ] = await Promise.all([
        client.get("/orders/shipments/?page_size=5"),
        client.get("/fleet/vehicles/"),
        client.get("/fleet/drivers/"),
        client.get("/dispatch/trips/"),
        client.get("/dashboard/vehicle_status/"),
        client.get("/dashboard/shipment_status/"),
        client.get("/dashboard/shipment_trend/"),
        client.get("/dashboard/weekly_performance/"),
        client.get("/dashboard/alerts/"),
        client.get("/dashboard/fuel_trend/"),
        client.get("/fleet/maintenance-records/upcoming/"),
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
      setAlerts(alertsRes.data);
      setFuelTrend(fuelTrendRes.data);
      setUpcomingMaintenance(maintenanceRes.data);
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

      {/* Live Map and Status Charts */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        <div className="col-span-1 bg-white border border-line rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-line flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-teal" />
              <h2 className="font-medium text-ink">Live Fleet Map</h2>
            </div>
            <Link to="/live-map" className="text-sm text-teal font-medium hover:underline">
              Full Map →
            </Link>
          </div>
          <div className="p-4">
            <LiveFleetMap />
          </div>
        </div>

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

      {/* Activity Feed and Alerts */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        <div className="col-span-2 bg-white border border-line rounded-xl overflow-hidden">
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

        <div className="bg-white border border-line rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-line flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-teal" />
              <h2 className="font-medium text-ink">Active Alerts</h2>
            </div>
            <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
              {alerts.length}
            </span>
          </div>
          <div className="p-4 max-h-64 overflow-y-auto">
            {alerts.length === 0 ? (
              <div className="text-center text-sm text-ink-700/50 py-8">
                No active alerts
              </div>
            ) : (
              alerts.slice(0, 5).map((alert) => (
                <AlertCard key={alert.id} alert={alert} />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Fuel and Maintenance */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white border border-line rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Fuel className="w-5 h-5 text-teal" />
            <h3 className="font-medium text-ink">Fuel Consumption Trend (30 Days)</h3>
          </div>
          <ResponsiveContainer width="100%" height={200}>
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

        <div className="bg-white border border-line rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-line flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-teal" />
              <h2 className="font-medium text-ink">Upcoming Maintenance</h2>
            </div>
            <Link to="/fleet" className="text-sm text-teal font-medium hover:underline">
              View All →
            </Link>
          </div>
          <div className="p-5">
            {upcomingMaintenance.length === 0 ? (
              <div className="text-center text-sm text-ink-700/50 py-8">
                No upcoming maintenance scheduled
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingMaintenance.slice(0, 5).map((maintenance) => (
                  <div key={maintenance.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center">
                        <Wrench size={18} />
                      </div>
                      <div>
                        <div className="font-medium text-sm">{maintenance.vehicle?.plate_number || 'Unknown Vehicle'}</div>
                        <div className="text-xs text-ink-700/60">{maintenance.get_maintenance_type_display()}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {new Date(maintenance.scheduled_date).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-ink-700/50">{maintenance.priority}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}