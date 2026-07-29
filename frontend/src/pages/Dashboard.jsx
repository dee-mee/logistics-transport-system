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
      
      // Fetch real shipments data, filtered by user role
      let shipmentsUrl = '/orders/shipments/';
      
      // If user is a driver, filter to show only their assigned shipments
      if (user?.role === 'driver') {
        // Need to get the driver ID, not user ID
        // For now, fetch all shipments and filter client-side
        const shipmentsRes = await client.get(shipmentsUrl);
        
        console.log('Dashboard shipments response:', shipmentsRes.data);
        console.log('User role:', user?.role, 'User ID:', user?.id);
        
        if (shipmentsRes.data && shipmentsRes.data.results) {
          // Filter shipments where driver_name matches the user's name or use other logic
          const shipments = shipmentsRes.data.results.filter(shipment => {
            // This is a temporary workaround - ideally the API should handle driver filtering
            return shipment.driver_name && shipment.driver_name.includes(user.username) || 
                   shipment.driver_id === user.id;
          });
          
          setActiveOrders(shipments);
          
          // Calculate stats from real data
          const totalShipments = shipments.length;
          const inTransitShipments = shipments.filter(s => s.status === 'in_transit').length;
          const assignedShipments = shipments.filter(s => s.status === 'assigned').length;
          
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
      } else {
        // Non-driver users see all shipments
        const shipmentsRes = await client.get(shipmentsUrl);
        
        console.log('Dashboard shipments response:', shipmentsRes.data);
        console.log('User role:', user?.role, 'User ID:', user?.id);
        
        if (shipmentsRes.data && shipmentsRes.data.results) {
          const shipments = shipmentsRes.data.results;
          setActiveOrders(shipments);
          
          // Calculate stats from real data
          const totalShipments = shipments.length;
          const inTransitShipments = shipments.filter(s => s.status === 'in_transit').length;
          const assignedShipments = shipments.filter(s => s.status === 'assigned').length;
          
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
      }
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTripDetails = async (orderId) => {
    if (!orderId) return;
    
    try {
      setMapLoading(true);
      console.log('Fetching trip details for shipment:', orderId);
      
      // Clear previous data to avoid showing wrong shipment data
      setWaypoints(null);
      setTripDetails(null);
      
      // Fetch shipment details and tracking events
      const [shipmentRes, eventsRes] = await Promise.all([
        client.get(`/orders/shipments/${orderId}/`),
        client.get(`/tracking/status-events/?shipment=${orderId}`),
      ]);
      
      console.log('Dashboard shipment response:', shipmentRes.data);
      console.log('Dashboard tracking events response:', eventsRes.data);
      
      if (shipmentRes.data) {
        setTripDetails(shipmentRes.data);
      }
      
      if (eventsRes.data && eventsRes.data.results) {
        // Create waypoints from tracking events, sorted by timestamp
        const sortedEvents = eventsRes.data.results
          .filter(event => event.lat && event.lng)
          .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        
        // Remove duplicate coordinates (same lat/lng) to avoid zigzag
        const uniqueWaypoints = [];
        const seen = new Set();
        
        sortedEvents.forEach(event => {
          const key = `${event.lat}-${event.lng}`;
          if (!seen.has(key)) {
            seen.add(key);
            uniqueWaypoints.push({
              lat: parseFloat(event.lat),
              lng: parseFloat(event.lng),
              timestamp: event.created_at,
              description: event.location_description
            });
          }
        });
        
        console.log('Dashboard unique sorted waypoints:', uniqueWaypoints);
        
        // If we have actual tracking waypoints, use them directly
        if (uniqueWaypoints.length > 0) {
          setWaypoints(uniqueWaypoints);
        } else {
          // Fallback: Use pickup and dropoff coordinates for routing
          const shipment = shipmentRes.data;
          if (shipment.pickup_lat && shipment.pickup_lng && shipment.dropoff_lat && shipment.dropoff_lng) {
            const pickup = [parseFloat(shipment.pickup_lat), parseFloat(shipment.pickup_lng)];
            const dropoff = [parseFloat(shipment.dropoff_lat), parseFloat(shipment.dropoff_lng)];
            
            // Use OSRM routing service to get road-based route
            try {
              const osrmResponse = await fetch(
                `https://router.project-osrm.org/route/v1/driving/${pickup[1]},${pickup[0]};${dropoff[1]},${dropoff[0]}?overview=full&geometries=geojson`
              );
              const osrmData = await osrmResponse.json();
              
              if (osrmData.routes && osrmData.routes[0]) {
                const routeCoords = osrmData.routes[0].geometry.coordinates.map(coord => 
                  [coord[1], coord[0]] // OSRM returns [lng, lat], we need [lat, lng]
                );
                
                console.log('OSRM route coordinates:', routeCoords);
                setWaypoints(routeCoords.map((coord, index) => ({
                  lat: coord[0],
                  lng: coord[1],
                  timestamp: null,
                  description: index === 0 ? 'Pickup (routed)' : index === routeCoords.length - 1 ? 'Dropoff (routed)' : 'Route point'
                })));
              } else {
                // Fallback to straight line if routing fails
                setWaypoints([
                  { lat: pickup[0], lng: pickup[1], timestamp: null, description: 'Pickup' },
                  { lat: dropoff[0], lng: dropoff[1], timestamp: null, description: 'Dropoff' }
                ]);
              }
            } catch (routingError) {
              console.error('OSRM routing failed:', routingError);
              // Fallback to straight line
              setWaypoints([
                { lat: pickup[0], lng: pickup[1], timestamp: null, description: 'Pickup' },
                { lat: dropoff[0], lng: dropoff[1], timestamp: null, description: 'Dropoff' }
              ]);
            }
          } else {
            setWaypoints([]);
          }
        }
      } else {
        console.log('No tracking events found for this shipment');
        setWaypoints([]);
      }
      
    } catch (error) {
      console.error('Error fetching trip details:', error);
      // Clear data on error
      setWaypoints([]);
      setTripDetails(null);
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