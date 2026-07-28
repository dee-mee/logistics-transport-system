import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import StatCard from '../components/StatCard';
import ActiveOrderCard from '../components/ActiveOrderCard';
import MapPanel from '../components/MapPanel';
import TripDetailPanel from '../components/TripDetailPanel';
import TransactionsTable from '../components/TransactionsTable';
import client from '../api/client';

export default function Dashboard() {
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Stats data - will be fetched from API
  const [stats, setStats] = useState({
    totalOrders: { value: '0', delta: 0, deltaDirection: 'up' },
    totalShipments: { value: '0', delta: 0, deltaDirection: 'up' },
    revenue: { value: '$0', delta: 0, deltaDirection: 'up' },
    totalExpense: { value: '$0', delta: 0, deltaDirection: 'down' },
  });
  
  // Active orders data
  const [activeOrders, setActiveOrders] = useState([]);
  
  // Map and trip details
  const [waypoints, setWaypoints] = useState(null);
  const [tripDetails, setTripDetails] = useState(null);
  
  // Transactions data
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    fetchDashboardData();
    // Refresh data every 60 seconds
    const interval = setInterval(fetchDashboardData, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedOrderId) {
      fetchTripDetails(selectedOrderId);
    }
  }, [selectedOrderId]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch real data
      const [statsRes, activeOrdersRes, transactionsRes] = await Promise.all([
        client.get('/dashboard/stats/'),
        client.get('/dashboard/active-orders/'),
        client.get('/dashboard/transactions/'),
      ]);

      if (statsRes.data) {
        setStats(statsRes.data);
      }
      
      if (activeOrdersRes.data && activeOrdersRes.data.length > 0) {
        setActiveOrders(activeOrdersRes.data);
        if (!selectedOrderId) {
          setSelectedOrderId(activeOrdersRes.data[0].id);
        }
      }
      
      if (transactionsRes.data) {
        setTransactions(transactionsRes.data);
      }
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTripDetails = async (orderId) => {
    try {
      const [waypointsRes, detailsRes] = await Promise.all([
        client.get('/dashboard/order-waypoints/', { params: { order_id: orderId } }),
        client.get('/dashboard/order-trip-details/', { params: { order_id: orderId } }),
      ]);
      
      if (waypointsRes.data) {
        setWaypoints(waypointsRes.data);
      }
      if (detailsRes.data) {
        setTripDetails(detailsRes.data);
      }
    } catch (error) {
      console.error('Error fetching trip details:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Dashboard</h1>
        <p className="text-sm text-gray-500">See all your shipment overview here.</p>
      </div>
      
      {/* Stat Cards Row */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <StatCard 
          label="Total Orders" 
          value={stats.totalOrders.value}
          delta={stats.totalOrders.delta}
          deltaDirection={stats.totalOrders.deltaDirection}
        />
        <StatCard 
          label="Total Shipments" 
          value={stats.totalShipments.value}
          delta={stats.totalShipments.delta}
          deltaDirection={stats.totalShipments.deltaDirection}
        />
        <StatCard 
          label="Revenue" 
          value={stats.revenue.value}
          delta={stats.revenue.delta}
          deltaDirection={stats.revenue.deltaDirection}
        />
        <StatCard 
          label="Total Expense" 
          value={stats.totalExpense.value}
          delta={stats.totalExpense.delta}
          deltaDirection={stats.totalExpense.deltaDirection}
        />
      </div>
      
      {/* Active Orders Section */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Active orders</h2>
        <Link to="/shipments" className="text-sm text-[#1e3a8a] hover:underline">
          View all
        </Link>
      </div>
      
      <div className="grid grid-cols-3 gap-6 mb-8">
        {activeOrders.map((order) => (
          <ActiveOrderCard
            key={order.id}
            order={order}
            isSelected={selectedOrderId === order.id}
            onSelect={setSelectedOrderId}
          />
        ))}
      </div>
      
      {/* Map + Trip Detail Panel */}
      <div className="grid grid-cols-5 gap-6 mb-8">
        <div className="col-span-3 bg-white rounded-xl shadow-card overflow-hidden">
          <MapPanel waypoints={waypoints} selectedOrder={activeOrders.find(o => o.id === selectedOrderId)} />
        </div>
        <div className="col-span-2 bg-white rounded-xl shadow-card">
          <TripDetailPanel tripDetails={tripDetails} />
        </div>
      </div>
      
      {/* Transactions Table */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Transactions</h2>
        <Link to="/shipments" className="text-sm text-[#1e3a8a] hover:underline">
          View all
        </Link>
      </div>
      
      <TransactionsTable transactions={transactions} />
    </>
  );
}