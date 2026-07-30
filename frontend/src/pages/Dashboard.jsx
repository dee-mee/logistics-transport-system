import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import StatCard from '../components/StatCard';
import ActiveOrderCard from '../components/ActiveOrderCard';
import MapPanel from '../components/MapPanel';
import TripDetailPanel from '../components/TripDetailPanel';
import TransactionsTable from '../components/TransactionsTable';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mapLoading, setMapLoading] = useState(false);
  
  // Stats data - will be fetched from API
  const [stats, setStats] = useState({
    totalOrders: { value: '0', delta: 0, deltaDirection: 'up' },
    totalShipments: { value: '0', delta: 0, deltaDirection: 'up' },
    revenue: { value: '$0', delta: 0, deltaDirection: 'up' },
    totalExpense: { value: '$0', delta: 0, deltaDirection: 'down' },
  });
  
  // Active orders data (real shipments)
  const [activeOrders, setActiveOrders] = useState([]);
  
  // Map and trip details
  const [waypoints, setWaypoints] = useState(null);
  const [tripDetails, setTripDetails] = useState(null);
  
  // Transactions data
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
    // Refresh data every 60 seconds
    const interval = setInterval(() => {
      if (user) {
        fetchDashboardData();
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (selectedOrderId) {
      fetchTripDetails(selectedOrderId);
    }
  }, [selectedOrderId]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch shipments data - backend now scopes per-user automatically
      const shipmentsUrl = '/orders/shipments/';
      const shipmentsRes = await client.get(shipmentsUrl);
      
      console.log('Dashboard shipments response:', shipmentsRes.data);
      console.log('User role:', user?.role, 'User ID:', user?.id);
      
      if (shipmentsRes.data?.results) {
        const shipments = shipmentsRes.data.results;
        setActiveOrders(shipments);
        
        // Calculate stats from real data
        const totalShipments = shipments.length;
        const inTransitShipments = shipments.filter(s => s.status === 'in_transit').length;
        
        setStats({
          totalOrders: { value: totalShipments.toString(), delta: 0, deltaDirection: 'up' },
          totalShipments: { value: inTransitShipments.toString(), delta: 0, deltaDirection: 'up' },
          revenue: { value: '$0', delta: 0, deltaDirection: 'up' },
          totalExpense: { value: '$0', delta: 0, deltaDirection: 'down' },
        });
        
        // Select first shipment if none selected, prefer in_transit shipments
        if (!selectedOrderId && shipments.length > 0) {
          const inTransitShipment = shipments.find(s => s.status === 'in_transit');
          setSelectedOrderId(inTransitShipment ? inTransitShipment.id : shipments[0].id);
        }
      }
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper: haversine distance in km between two [lat, lng] points
  function haversineKm([lat1, lng1], [lat2, lng2]) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // Helper: does this ordered set of points need road-snapping?
  function needsRouting(points, thresholdKm = 2) {
    if (points.length < 2) return false;
    for (let i = 1; i < points.length; i++) {
      if (haversineKm(points[i - 1], points[i]) > thresholdKm) return true;
    }
    return false;
  }

  // Helper: call OSRM with an ordered list of [lat, lng] waypoints
  async function routeViaOSRM(points) {
    // OSRM wants lng,lat and semicolon-separated coordinate pairs
    const coordString = points.map(([lat, lng]) => `${lng},${lat}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.routes && data.routes[0]) {
      return data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
    }
    return null; // let caller fall back to straight line
  }

  const fetchTripDetails = async (orderId) => {
    if (!orderId) return;

    try {
      setMapLoading(true);
      setWaypoints(null);
      setTripDetails(null);

      const [shipmentRes, eventsRes] = await Promise.all([
        client.get(`/orders/shipments/${orderId}/`),
        client.get(`/tracking/status-events/?shipment=${orderId}`),
      ]);

      if (shipmentRes.data) setTripDetails(shipmentRes.data);

      const shipment = shipmentRes.data;
      const pickup = shipment?.pickup_lat && shipment?.pickup_lng
        ? [parseFloat(shipment.pickup_lat), parseFloat(shipment.pickup_lng)]
        : null;
      const dropoff = shipment?.dropoff_lat && shipment?.dropoff_lng
        ? [parseFloat(shipment.dropoff_lat), parseFloat(shipment.dropoff_lng)]
        : null;

      // Build the ordered list of known points: pickup -> tracking pings -> dropoff
      let sortedEvents = [];
      if (eventsRes.data?.results) {
        sortedEvents = eventsRes.data.results
          .filter(e => e.lat && e.lng)
          .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      }

      const seen = new Set();
      const trackedPoints = [];
      sortedEvents.forEach(event => {
        const key = `${event.lat}-${event.lng}`;
        if (!seen.has(key)) {
          seen.add(key);
          trackedPoints.push({
            coord: [parseFloat(event.lat), parseFloat(event.lng)],
            timestamp: event.created_at,
            description: event.location_description,
          });
        }
      });

      // Assemble the full ordered route: pickup, tracked pings (deduped), dropoff
      const orderedCoords = [];
      if (pickup) orderedCoords.push(pickup);
      trackedPoints.forEach(p => orderedCoords.push(p.coord));
      if (dropoff) orderedCoords.push(dropoff);

      if (orderedCoords.length < 2) {
        // Not enough data to draw anything meaningful
        setWaypoints(trackedPoints.map(p => ({
          lat: p.coord[0], lng: p.coord[1], timestamp: p.timestamp, description: p.description,
        })));
        return;
      }

      let finalWaypoints;

      if (needsRouting(orderedCoords)) {
        try {
          const routed = await routeViaOSRM(orderedCoords);
          if (routed) {
            finalWaypoints = routed.map((coord, i) => ({
              lat: coord[0],
              lng: coord[1],
              timestamp: null,
              description: i === 0 ? 'Pickup (routed)'
                : i === routed.length - 1 ? 'Dropoff (routed)'
                : 'Route point',
            }));
          }
        } catch (routingError) {
          console.error('OSRM routing failed:', routingError);
        }
      }

      // Fallback: straight line between the known points if routing wasn't
      // needed, failed, or returned nothing
      if (!finalWaypoints) {
        finalWaypoints = orderedCoords.map((coord, i) => ({
          lat: coord[0],
          lng: coord[1],
          timestamp: trackedPoints[i - (pickup ? 1 : 0)]?.timestamp ?? null,
          description: i === 0 ? 'Pickup'
            : i === orderedCoords.length - 1 ? 'Dropoff'
            : 'Tracked point',
        }));
      }

      setWaypoints(finalWaypoints);
    } catch (error) {
      console.error('Error fetching trip details:', error);
      setWaypoints([]);
    } finally {
      setMapLoading(false);
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
        <h2 className="text-lg font-semibold text-gray-900">Active Shipments</h2>
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
          {mapLoading ? (
            <div className="h-[400px] flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
            </div>
          ) : (
            <MapPanel waypoints={waypoints} selectedOrder={activeOrders.find(o => o.id === selectedOrderId)} />
          )}
        </div>
        <div className="col-span-2 bg-white rounded-xl shadow-card">
          {mapLoading ? (
            <div className="h-[400px] flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
            </div>
          ) : (
            <TripDetailPanel tripDetails={tripDetails} />
          )}
        </div>
      </div>
      
      {/* Transactions Table */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
        <Link to="/shipments" className="text-sm text-[#1e3a8a] hover:underline">
          View all
        </Link>
      </div>
      
      <TransactionsTable transactions={activeOrders} />
    </>
  );
}