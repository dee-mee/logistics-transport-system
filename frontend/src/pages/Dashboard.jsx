import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
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
  
  // All shipments for Recent Activity (including delivered)
  const [allShipments, setAllShipments] = useState([]);
  
  // Map and trip details
  const [waypoints, setWaypoints] = useState(null);
  const [tripDetails, setTripDetails] = useState(null);
  
  // Transactions data
  const [transactions, setTransactions] = useState([]);
  
  // Location reporting state
  const [reportingLocation, setReportingLocation] = useState(false);

  // Function for driver to report their current location
  const reportCurrentLocation = async () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setReportingLocation(true);
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });

      const { latitude, longitude } = position.coords;
      
      // Round to 6 decimal places to match backend validation
      const roundedLat = Math.round(latitude * 1000000) / 1000000;
      const roundedLng = Math.round(longitude * 1000000) / 1000000;

      // Send location to backend using the VehicleLocationPing endpoint
      await client.post('/tracking/location-pings/report_location/', {
        lat: roundedLat,
        lng: roundedLng,
        address: 'Driver reported location'
      });

      alert('Location reported successfully!');
    } catch (error) {
      console.error('Error reporting location:', error);
      alert('Failed to report location. Please ensure location services are enabled.');
    } finally {
      setReportingLocation(false);
    }
  };

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
        console.log('All shipments data:', shipments);
        // Filter out delivered shipments from active orders
        const activeShipments = shipments.filter(s => s.status !== 'delivered');
        setActiveOrders(activeShipments);
        
        // For Recent Activity, use all shipments (including delivered)
        // This way drivers can see their completed work
        setAllShipments(shipments);
        
        console.log('Active shipments:', activeShipments);
        console.log('All shipments for Recent Activity:', shipments);
        
        // Calculate stats from real data (use the shipments variable directly, not state)
        const totalShipments = shipments.length; // All shipments (including delivered)
        const activeShipmentsCount = activeShipments.length; // Only non-delivered
        const inTransitShipments = activeShipments.filter(s => s.status === 'in_transit').length;
        
        // Calculate revenue from all shipments
        const totalRevenue = shipments.reduce((sum, s) => sum + (s.price || 0), 0);
        
        // Calculate total distance covered using haversine formula
        let totalDistanceKm = 0;
        shipments.forEach(shipment => {
          if (shipment.pickup_lat && shipment.pickup_lng && 
              shipment.dropoff_lat && shipment.dropoff_lng) {
            const pickup = [parseFloat(shipment.pickup_lat), parseFloat(shipment.pickup_lng)];
            const dropoff = [parseFloat(shipment.dropoff_lat), parseFloat(shipment.dropoff_lng)];
            const distance = haversineKm(pickup, dropoff);
            totalDistanceKm += distance;
          }
        });
        
        console.log('Total shipments (all):', totalShipments);
        console.log('Active shipments count:', activeShipmentsCount);
        console.log('In transit shipments count:', inTransitShipments);
        console.log('Total revenue:', totalRevenue);
        console.log('Total distance covered:', totalDistanceKm);
        
        setStats({
          totalOrders: { value: totalShipments.toString(), delta: 0, deltaDirection: 'up' },
          totalShipments: { value: activeShipmentsCount.toString(), delta: 0, deltaDirection: 'up' },
          revenue: { value: `$${totalRevenue.toLocaleString()}`, delta: 0, deltaDirection: 'up' },
          totalExpense: { value: `${totalDistanceKm.toFixed(1)} km`, delta: 0, deltaDirection: 'down' },
        });
        
        // Select first shipment if none selected, prefer in_transit shipments
        if (!selectedOrderId) {
          if (activeShipments.length > 0) {
            const inTransitShipment = activeShipments.find(s => s.status === 'in_transit');
            setSelectedOrderId(inTransitShipment ? inTransitShipment.id : activeShipments[0].id);
          } else {
            // No active shipments - set selectedOrderId to null to show default map
            setSelectedOrderId(null);
          }
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

      console.log('Fetching trip details for order:', orderId);

      const [shipmentRes, eventsRes] = await Promise.all([
        client.get(`/orders/shipments/${orderId}/`),
        client.get(`/tracking/status-events/?shipment=${orderId}`),
      ]);

      console.log('Shipment response:', shipmentRes.data);
      console.log('Events response:', eventsRes.data);

      if (shipmentRes.data) setTripDetails(shipmentRes.data);

      const shipment = shipmentRes.data;
      const pickup = shipment?.pickup_lat && shipment?.pickup_lng
        ? [parseFloat(shipment.pickup_lat), parseFloat(shipment.pickup_lng)]
        : null;
      const dropoff = shipment?.dropoff_lat && shipment?.dropoff_lng
        ? [parseFloat(shipment.dropoff_lat), parseFloat(shipment.dropoff_lng)]
        : null;

      console.log('Pickup coords:', pickup);
      console.log('Dropoff coords:', dropoff);

      // Build the ordered list of known points: pickup -> tracking pings -> dropoff
      let sortedEvents = [];
      if (eventsRes.data?.results) {
        sortedEvents = eventsRes.data.results
          .filter(e => e.lat && e.lng)
          .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      }

      console.log('Sorted events with coordinates:', sortedEvents);
      console.log('Number of events with coordinates:', sortedEvents.length);

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

      console.log('Tracked points:', trackedPoints);

      // Assemble the full ordered route: pickup, tracked pings (deduped), dropoff
      const orderedCoords = [];
      if (pickup) orderedCoords.push(pickup);
      trackedPoints.forEach(p => orderedCoords.push(p.coord));
      if (dropoff) orderedCoords.push(dropoff);

      console.log('Ordered coords:', orderedCoords);
      console.log('Number of ordered coords:', orderedCoords.length);

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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">Dashboard</h1>
          <p className="text-sm text-gray-500">See all your shipment overview here.</p>
        </div>
        {user?.role === 'driver' && (
          <button
            onClick={reportCurrentLocation}
            disabled={reportingLocation}
            className="flex items-center gap-2 bg-[#1e3a8a] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#1e40af] transition-colors disabled:opacity-50"
          >
            <MapPin size={16} />
            {reportingLocation ? 'Reporting...' : 'Report Current Location'}
          </button>
        )}
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
          label="Distance Covered" 
          value={stats.totalExpense.value}
          delta={stats.totalExpense.delta}
          deltaDirection={stats.totalExpense.deltaDirection}
        />
      </div>
      
      {/* Active Orders Section */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Active Shipments</h2>
        {user?.role === 'driver' ? (
          <Link to="/trips" className="text-sm text-[#1e3a8a] hover:underline">
            View all trips
          </Link>
        ) : (
          <Link to="/shipments" className="text-sm text-[#1e3a8a] hover:underline">
            View all
          </Link>
        )}
      </div>
      
      <div className="grid grid-cols-3 gap-6 mb-8">
        {activeOrders.length === 0 ? (
          <div className="col-span-3 bg-white rounded-xl shadow-card p-8 text-center text-gray-500">
            <p className="mb-2">No active shipments</p>
            <p className="text-sm">You have no active trips at the moment</p>
          </div>
        ) : (
          activeOrders.map((order) => (
            <ActiveOrderCard
              key={order.id}
              order={order}
              isSelected={selectedOrderId === order.id}
              onSelect={setSelectedOrderId}
            />
          ))
        )}
      </div>
      
      {/* Map + Trip Detail Panel */}
      <div className="grid grid-cols-5 gap-6 mb-8">
        <div className="col-span-3 bg-white rounded-xl shadow-card overflow-hidden">
          {mapLoading ? (
            <div className="h-[400px] flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
            </div>
          ) : (
            <MapPanel 
              waypoints={waypoints} 
              selectedOrder={activeOrders.length > 0 ? allShipments.find(o => o.id === selectedOrderId) : null}
            />
          )}
        </div>
        <div className="col-span-2 bg-white rounded-xl shadow-card">
          {mapLoading ? (
            <div className="h-[400px] flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
            </div>
          ) : activeOrders.length > 0 ? (
            <TripDetailPanel tripDetails={tripDetails} />
          ) : (
            <div className="h-[400px] flex items-center justify-center text-gray-500">
              <div className="text-center">
                <p className="mb-2">No active trips</p>
                <p className="text-sm">Waiting for new assignment</p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Transactions Table */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
        {user?.role === 'driver' ? (
          <Link to="/trips" className="text-sm text-[#1e3a8a] hover:underline">
            View all trips
          </Link>
        ) : (
          <Link to="/shipments" className="text-sm text-[#1e3a8a] hover:underline">
            View all
          </Link>
        )}
      </div>
      
      <TransactionsTable transactions={allShipments} />
    </>
  );
}