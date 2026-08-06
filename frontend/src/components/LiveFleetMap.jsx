import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import client from '../api/client';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet
const customIcon = (color = '#3B82F6', emoji = '🚗') => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background-color: ${color}; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; font-size: 16px; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">
      ${emoji}
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
};

const LiveFleetMap = () => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [mapCenter, setMapCenter] = useState([20, 0]);
  const [mapZoom, setMapZoom] = useState(2);

  useEffect(() => {
    fetchLiveMapData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchLiveMapData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchLiveMapData = async () => {
    try {
      setLoading(true);
      const response = await client.get('/tracking/location-pings/live_map/');
      setVehicles(response.data);
      setError(null);
      
      // Update map center if we have vehicles
      if (response.data.length > 0) {
        const avgLat = response.data.reduce((sum, v) => sum + (v.lat || 0), 0) / response.data.length;
        const avgLng = response.data.reduce((sum, v) => sum + (v.lng || 0), 0) / response.data.length;
        setMapCenter([avgLat, avgLng]);
        setMapZoom(6);
      }
    } catch (err) {
      setError('Failed to load live map data');
      console.error('Error fetching live map data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'available': '#10B981',
      'in_use': '#3B82F6',
      'on_trip': '#EF4444', // red for busy on trip
      'maintenance': '#F59E0B',
      'out_of_service': '#EF4444',
    };
    return colors[status] || '#6B7280';
  };

  const getVehicleIcon = (vehicleType) => {
    const icons = {
      'truck': '🚛',
      'van': '🚐',
      'car': '🚗',
      'motorcycle': '🏍️',
    };
    return icons[vehicleType] || '🚗';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 h-full">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6 h-full">
        <div className="flex items-center justify-center h-64">
          <div className="text-red-600">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 h-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Live Fleet Map</h3>
        <button
          onClick={fetchLiveMapData}
          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
        >
          Refresh
        </button>
      </div>

      {/* Map Container */}
      <div className="relative bg-gray-100 rounded-lg h-64 mb-4 overflow-hidden">
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
          scrollWheelZoom={false}
          dragging={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
          
          {vehicles.map((vehicle) => {
            if (!vehicle.lat || !vehicle.lng) return null;
            
            return (
              <Marker
                key={vehicle.vehicle_id}
                position={[vehicle.lat, vehicle.lng]}
                icon={customIcon(getStatusColor(vehicle.status), getVehicleIcon(vehicle.vehicle_type))}
                eventHandlers={{
                  click: () => setSelectedVehicle(vehicle)
                }}
              >
                <Popup>
                  <div className="p-2">
                    <div className="font-bold text-gray-800">{vehicle.plate_number}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      <div>Type: {vehicle.vehicle_type}</div>
                      <div>Status: {vehicle.status}</div>
                      {vehicle.driver_name && <div>Driver: {vehicle.driver_name}</div>}
                      {vehicle.speed_kmh && <div>Speed: {vehicle.speed_kmh} km/h</div>}
                      {vehicle.address && <div>📍 {vehicle.address}</div>}
                      <div className="text-xs text-gray-500 mt-2">
                        Last update: {new Date(vehicle.last_update).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* Vehicle List */}
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {vehicles.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            <div className="text-2xl mb-2">🚗</div>
            No vehicle locations available yet.
            <div className="text-xs mt-1">Drivers will appear on the map when they report their location</div>
          </div>
        ) : vehicles.map((vehicle) => (
          <div
            key={vehicle.vehicle_id}
            className={`p-3 rounded-lg border cursor-pointer transition-colors ${
              selectedVehicle?.vehicle_id === vehicle.vehicle_id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-blue-300'
            }`}
            onClick={() => setSelectedVehicle(vehicle)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{getVehicleIcon(vehicle.vehicle_type)}</span>
                <div>
                  <div className="font-medium text-gray-800">{vehicle.plate_number}</div>
                  <div className="text-sm text-gray-600">
                    {vehicle.driver_name || 'Unassigned'}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getStatusColor(vehicle.status) }}></div>
                <div className="text-xs text-gray-500 mt-1">
                  {vehicle.speed_kmh ? `${vehicle.speed_kmh} km/h` : 'Stationary'}
                </div>
              </div>
            </div>
            {vehicle.address && (
              <div className="text-xs text-gray-500 mt-2 truncate">
                📍 {vehicle.address}
              </div>
            )}
            {vehicle.status_update && (
              <div className="text-xs text-blue-600 mt-1">
                Status: {vehicle.status_update}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Selected Vehicle Details */}
      {selectedVehicle && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-gray-800 mb-2">
            {selectedVehicle.plate_number} Details
          </h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-600">Type:</span> {selectedVehicle.vehicle_type}
            </div>
            <div>
              <span className="text-gray-600">Status:</span> {selectedVehicle.status}
            </div>
            <div>
              <span className="text-gray-600">Driver:</span> {selectedVehicle.driver_name || 'N/A'}
            </div>
            <div>
              <span className="text-gray-600">Speed:</span> {selectedVehicle.speed_kmh || '0'} km/h
            </div>
            <div className="col-span-2">
              <span className="text-gray-600">Location:</span> {selectedVehicle.address || 'N/A'}
            </div>
            <div className="col-span-2">
              <span className="text-gray-600">Coordinates:</span> {selectedVehicle.lat?.toFixed(4) || 'N/A'}, {selectedVehicle.lng?.toFixed(4) || 'N/A'}
            </div>
            <div className="col-span-2">
              <span className="text-gray-600">Last Update:</span>{' '}
              {new Date(selectedVehicle.last_update).toLocaleString()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveFleetMap;