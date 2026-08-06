import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { MapPin } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import client from '../api/client';
import { getShipmentColor } from '../utils/shipmentColors';
import { useAuth } from '../context/AuthContext';

// Fix for default marker icons in Leaflet
if (typeof window !== 'undefined') {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
}

function formatLastReported(recordedAt) {
  if (!recordedAt) return 'No manual report yet';

  const diffMs = Date.now() - new Date(recordedAt).getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMinutes < 1) return 'Reported just now';
  if (diffMinutes < 60) return `Reported ${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `Reported ${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `Reported ${diffDays}d ago`;
}

function DriverTracking({ shipment }) {
  const { user } = useAuth();
  const [driverLocation, setDriverLocation] = useState(null);
  const [locationHistory, setLocationHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reportingLocation, setReportingLocation] = useState(false);
  const [lastReportedAt, setLastReportedAt] = useState(null);

  const shipmentColor = getShipmentColor(shipment?.id);
  const isDriver = user?.role === 'driver';

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
      const roundedLat = Math.round(latitude * 1000000) / 1000000;
      const roundedLng = Math.round(longitude * 1000000) / 1000000;

      await client.post('/tracking/location-pings/report_location/', {
        lat: roundedLat,
        lng: roundedLng,
        address: 'Driver reported location'
      });

      alert('Location reported successfully!');

      // Refresh from server so trip history and freshness stay consistent
      const historyRes = await client.get(
        `/tracking/location-pings/history_for_shipment/?shipment_id=${shipment.id}`
      );
      const pings = historyRes.data?.data ?? [];
      if (pings.length > 0) {
        const uniqueRoutePoints = [];
        const seen = new Set();
        pings.forEach((ping) => {
          if (!ping.lat || !ping.lng) return;
          const key = `${ping.lat}-${ping.lng}`;
          if (!seen.has(key)) {
            seen.add(key);
            uniqueRoutePoints.push({
              lat: parseFloat(ping.lat),
              lng: parseFloat(ping.lng),
              recorded_at: ping.recorded_at,
            });
          }
        });
        if (uniqueRoutePoints.length > 0) {
          const latestPing = uniqueRoutePoints[uniqueRoutePoints.length - 1];
          setLocationHistory(uniqueRoutePoints.map((point) => [point.lat, point.lng]));
          setDriverLocation(latestPing);
          setLastReportedAt(latestPing.recorded_at);
        }
      } else {
        setDriverLocation({ lat: roundedLat, lng: roundedLng });
        setLastReportedAt(new Date().toISOString());
        setLocationHistory((prev) => [...prev, [roundedLat, roundedLng]]);
      }
    } catch (error) {
      console.error('Error reporting location:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.detail ||
        'Failed to report location. Please ensure location services are enabled and a vehicle is assigned.';
      alert(errorMessage);
    } finally {
      setReportingLocation(false);
    }
  };

  useEffect(() => {
    if (!shipment.driver) return;

    setDriverLocation(null);
    setLocationHistory([]);
    setLastReportedAt(null);
    setLoading(true);

    const fetchDriverLocation = async () => {
      try {
        const historyRes = await client.get(
          `/tracking/location-pings/history_for_shipment/?shipment_id=${shipment.id}`
        );
        const pings = historyRes.data?.data ?? [];

        const uniqueRoutePoints = [];
        const seen = new Set();

        pings.forEach((ping) => {
          if (!ping.lat || !ping.lng) return;
          const key = `${ping.lat}-${ping.lng}`;
          if (!seen.has(key)) {
            seen.add(key);
            uniqueRoutePoints.push({
              lat: parseFloat(ping.lat),
              lng: parseFloat(ping.lng),
              recorded_at: ping.recorded_at,
              address: ping.address,
            });
          }
        });

        if (uniqueRoutePoints.length > 0) {
          const latestPing = uniqueRoutePoints[uniqueRoutePoints.length - 1];
          setLocationHistory(uniqueRoutePoints.map((point) => [point.lat, point.lng]));
          setDriverLocation(latestPing);
          setLastReportedAt(latestPing.recorded_at);
        } else if (shipment.pickup_lat && shipment.pickup_lng) {
          setDriverLocation({
            lat: parseFloat(shipment.pickup_lat),
            lng: parseFloat(shipment.pickup_lng)
          });
          setLastReportedAt(null);

          if (shipment.dropoff_lat && shipment.dropoff_lng) {
            const pickup = [parseFloat(shipment.pickup_lat), parseFloat(shipment.pickup_lng)];
            const dropoff = [parseFloat(shipment.dropoff_lat), parseFloat(shipment.dropoff_lng)];

            try {
              const osrmResponse = await fetch(
                `https://router.project-osrm.org/route/v1/driving/${pickup[1]},${pickup[0]};${dropoff[1]},${dropoff[0]}?overview=full&geometries=geojson`
              );
              const osrmData = await osrmResponse.json();

              if (osrmData.routes && osrmData.routes[0]) {
                const routeCoords = osrmData.routes[0].geometry.coordinates.map((coord) =>
                  [coord[1], coord[0]]
                );
                setLocationHistory(routeCoords);
              } else {
                setLocationHistory([pickup, dropoff]);
              }
            } catch (routingError) {
              console.error('DriverTracking OSRM routing failed:', routingError);
              setLocationHistory([pickup, dropoff]);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching driver location:', error);
        if (shipment.pickup_lat && shipment.pickup_lng) {
          setDriverLocation({
            lat: parseFloat(shipment.pickup_lat),
            lng: parseFloat(shipment.pickup_lng)
          });
        }
        setLastReportedAt(null);
      } finally {
        setLoading(false);
      }
    };

    fetchDriverLocation();
    const interval = setInterval(fetchDriverLocation, 30000);
    return () => clearInterval(interval);
  }, [shipment.id, shipment.driver, shipment.pickup_lat, shipment.pickup_lng, shipment.dropoff_lat, shipment.dropoff_lng]);

  if (loading) {
    return (
      <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-gray-500">Loading driver location...</div>
      </div>
    );
  }

  if (!driverLocation) {
    return (
      <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-gray-500">No driver location available</div>
      </div>
    );
  }

  const driverIcon = new L.Icon({
    iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  const pickupIcon = new L.Icon({
    iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  const dropoffIcon = new L.Icon({
    iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900">Driver Tracking</h3>
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: shipmentColor.primary }}
          />
          <span className="text-xs text-gray-500">{formatLastReported(lastReportedAt)}</span>
        </div>
      </div>

      {isDriver && (
        <button
          onClick={reportCurrentLocation}
          disabled={reportingLocation}
          className="flex items-center gap-2 bg-[#1e3a8a] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#1e40af] transition-colors disabled:opacity-50"
        >
          <MapPin size={16} />
          {reportingLocation ? 'Reporting...' : 'Report Current Location'}
        </button>
      )}

      <div className="h-64 rounded-lg border border-gray-300 overflow-hidden">
        <MapContainer
          center={[driverLocation.lat, driverLocation.lng]}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />

          <Marker
            position={[driverLocation.lat, driverLocation.lng]}
            icon={driverIcon}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-medium" style={{ color: shipmentColor.primary }}>
                  🚚 Driver Location
                </div>
                <div>{shipment.driver_name}</div>
                <div className="text-xs text-gray-400 mt-1">
                  {shipment.tracking_code}
                </div>
              </div>
            </Popup>
          </Marker>

          {locationHistory.length > 0 && (
            <Polyline
              positions={locationHistory}
              color={shipmentColor.primary}
              weight={3}
              opacity={0.7}
            />
          )}

          {shipment.pickup_lat && shipment.pickup_lng && (
            <Marker
              position={[parseFloat(shipment.pickup_lat), parseFloat(shipment.pickup_lng)]}
              icon={pickupIcon}
            >
              <Popup>
                <div className="text-sm">
                  <div className="font-medium" style={{ color: shipmentColor.primary }}>
                    🚩 Pickup
                  </div>
                  <div>{shipment.pickup_address}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {shipment.tracking_code}
                  </div>
                </div>
              </Popup>
            </Marker>
          )}

          {shipment.dropoff_lat && shipment.dropoff_lng && (
            <Marker
              position={[parseFloat(shipment.dropoff_lat), parseFloat(shipment.dropoff_lng)]}
              icon={dropoffIcon}
            >
              <Popup>
                <div className="text-sm">
                  <div className="font-medium" style={{ color: shipmentColor.primary }}>
                    🏁 Dropoff
                  </div>
                  <div>{shipment.dropoff_address}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {shipment.tracking_code}
                  </div>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      <div className="grid grid-cols-3 gap-4 text-sm">
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="text-gray-500 text-xs">Status</div>
          <div className="font-medium capitalize">{shipment.status.replace(/_/g, ' ')}</div>
        </div>
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="text-gray-500 text-xs">Driver</div>
          <div className="font-medium">{shipment.driver_name || 'Not assigned'}</div>
        </div>
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="text-gray-500 text-xs">Vehicle</div>
          <div className="font-medium">{shipment.vehicle_plate || 'Not assigned'}</div>
        </div>
      </div>

      <div className="text-xs text-gray-500">
        Route line uses manual driver reports when available. If no manual reports exist yet, the map falls back to the planned route between pickup and dropoff.
      </div>
    </div>
  );
}

export default DriverTracking;
