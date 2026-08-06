import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import client from '../api/client';
import 'leaflet/dist/leaflet.css';
import './LiveMap.css';

// Fix for default marker icons in Leaflet with React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom icon for vehicle markers
const customIcon = (color = '#3B82F6', emoji = '🚗') => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background-color: ${color}; width: 36px; height: 36px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; font-size: 18px; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
      ${emoji}
    </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
};

const LiveMap = () => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [mapCenter, setMapCenter] = useState([20, 0]); // Default center
  const [mapZoom, setMapZoom] = useState(2);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    vehicleType: '',
    driver: ''
  });

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
      
      // Update map center if we have vehicles, otherwise keep default
      if (response.data.length > 0) {
        const validVehicles = response.data.filter(v => v.lat && v.lng);
        if (validVehicles.length > 0) {
          const avgLat = validVehicles.reduce((sum, v) => sum + parseFloat(v.lat), 0) / validVehicles.length;
          const avgLng = validVehicles.reduce((sum, v) => sum + parseFloat(v.lng), 0) / validVehicles.length;
          setMapCenter([avgLat, avgLng]);
          setMapZoom(10);
        } else {
          // Keep default center if no valid coordinates
          setMapCenter([20, 0]);
          setMapZoom(2);
        }
      }
      // If no vehicles, keep default center [20, 0] and zoom 2
    } catch (err) {
      setError('Failed to load live map data');
      console.error('Error fetching live map data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'available': '#10B981', // green
      'in_use': '#3B82F6', // blue
      'on_trip': '#EF4444', // red for busy on trip
      'maintenance': '#F59E0B', // yellow
      'out_of_service': '#EF4444', // red
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

  const filteredVehicles = vehicles.filter(vehicle => {
    if (filters.status && vehicle.status !== filters.status) return false;
    if (filters.vehicleType && vehicle.vehicle_type !== filters.vehicleType) return false;
    if (filters.driver && vehicle.driver_name !== filters.driver) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <div className="text-gray-600">Loading map...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-2">Error loading map</div>
          <div className="text-gray-600">{error}</div>
          <button 
            onClick={fetchLiveMapData}
            className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col relative">
      {/* Filter Controls Bar */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-3 flex items-center justify-between z-10 relative">
        <div className="flex items-center gap-4">
          <div className="text-2xl">🗺️</div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Live Fleet Map</h1>
            <p className="text-xs text-gray-600">Real-time GPS tracking of your fleet vehicles</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">
            <span className="font-semibold text-gray-900">{filteredVehicles.length}</span> vehicles tracked
          </div>
          
          {/* Combined Filter Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className="flex items-center gap-2 px-4 py-2 bg-[#1e3a8a] text-white rounded-lg text-sm font-medium hover:bg-[#1e40af] transition-colors"
            >
              <span>🔍</span>
              Filters & Actions
              <span className="text-xs">▼</span>
            </button>
            
            {showFilterDropdown && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-200 z-[9999]">
                <div className="p-4">
                  <h3 className="font-semibold text-gray-800 mb-3">Filters</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Vehicle Status</label>
                      <select 
                        value={filters.status}
                        onChange={(e) => setFilters({...filters, status: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent"
                      >
                        <option value="">All Status</option>
                        <option value="available">Available</option>
                        <option value="in_use">In Use</option>
                        <option value="on_trip">On Trip (Busy)</option>
                        <option value="maintenance">Maintenance</option>
                        <option value="out_of_service">Out of Service</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Vehicle Type</label>
                      <select 
                        value={filters.vehicleType}
                        onChange={(e) => setFilters({...filters, vehicleType: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent"
                      >
                        <option value="">All Types</option>
                        <option value="truck">Truck</option>
                        <option value="van">Van</option>
                        <option value="car">Car</option>
                        <option value="motorcycle">Motorcycle</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Driver</label>
                      <select 
                        value={filters.driver}
                        onChange={(e) => setFilters({...filters, driver: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent"
                      >
                        <option value="">All Drivers</option>
                        {[...new Set(vehicles.map(v => v.driver_name).filter(Boolean))].map(driver => (
                          <option key={driver} value={driver}>{driver}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div className="border-t border-gray-200 mt-4 pt-4">
                    <h3 className="font-semibold text-gray-800 mb-3">Quick Actions</h3>
                    <div className="space-y-2">
                      <button
                        onClick={() => {
                          setMapCenter([20, 0]);
                          setMapZoom(2);
                        }}
                        className="w-full px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                      >
                        <span>🌍</span> Reset View
                      </button>
                      <button
                        onClick={() => {
                          fetchLiveMapData();
                          setShowFilterDropdown(false);
                        }}
                        className="w-full px-3 py-2 bg-[#1e3a8a] text-white rounded-lg text-sm font-medium hover:bg-[#1e40af] transition-colors flex items-center justify-center gap-2"
                      >
                        <span>🔄</span> Refresh Data
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Full Page Map */}
      <div className="flex-1 relative min-h-[400px]">
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
          
          {filteredVehicles.map((vehicle) => {
            const lat = parseFloat(vehicle.lat);
            const lng = parseFloat(vehicle.lng);
            
            if (!lat || !lng || isNaN(lat) || isNaN(lng)) return null;
            
            return (
              <Marker
                key={vehicle.vehicle_id}
                position={[lat, lng]}
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
        
        {/* Floating Vehicle List Panel */}
        {filteredVehicles.length > 0 && (
          <div className="absolute top-4 right-4 w-80 bg-white rounded-lg shadow-xl border border-gray-200 max-h-[calc(100vh-200px)] overflow-hidden z-[1000]">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-[#1e3a8a]/10 to-blue-100">
              <h3 className="font-semibold text-gray-800">Fleet Vehicles</h3>
              <span className="text-xs bg-[#1e3a8a] text-white px-2 py-1 rounded-full">
                {filteredVehicles.length}
              </span>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto">
              <div className="space-y-2">
                {filteredVehicles.map((vehicle) => (
                  <div
                    key={vehicle.vehicle_id}
                    className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                      selectedVehicle?.vehicle_id === vehicle.vehicle_id
                        ? 'border-[#1e3a8a] bg-blue-50 shadow-md'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                    onClick={() => {
                      setSelectedVehicle(vehicle);
                      const lat = parseFloat(vehicle.lat);
                      const lng = parseFloat(vehicle.lng);
                      if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
                        setMapCenter([lat, lng]);
                        setMapZoom(13);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl" style={{ backgroundColor: getStatusColor(vehicle.status) + '20' }}>
                          {getVehicleIcon(vehicle.vehicle_type)}
                        </div>
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
                      <div className="text-xs text-gray-500 mt-2 truncate flex items-center gap-1">
                        <span>📍</span> {vehicle.address}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* Selected Vehicle Details Panel */}
        {selectedVehicle && (
          <div className="absolute bottom-4 right-4 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-[1000]">
            <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-[#1e3a8a]/10 to-blue-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Vehicle Details</h3>
              <button
                onClick={() => setSelectedVehicle(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            <div className="p-4">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl" style={{ backgroundColor: getStatusColor(selectedVehicle.status) + '20' }}>
                    {getVehicleIcon(selectedVehicle.vehicle_type)}
                  </div>
                  <div>
                    <div className="font-bold text-xl text-gray-800">{selectedVehicle.plate_number}</div>
                    <div className="text-sm text-gray-600">{selectedVehicle.vehicle_type}</div>
                    <div className="text-xs px-2 py-1 rounded-full inline-block mt-1" style={{ backgroundColor: getStatusColor(selectedVehicle.status) + '20', color: getStatusColor(selectedVehicle.status) }}>
                      {selectedVehicle.status}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-xs text-gray-500 mb-1">Driver</div>
                    <div className="font-medium text-gray-800">{selectedVehicle.driver_name || 'N/A'}</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-xs text-gray-500 mb-1">Speed</div>
                    <div className="font-medium text-gray-800">{selectedVehicle.speed_kmh || '0'} km/h</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-xs text-gray-500 mb-1">Latitude</div>
                    <div className="font-medium text-gray-800">{parseFloat(selectedVehicle.lat)?.toFixed(4) || 'N/A'}</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-xs text-gray-500 mb-1">Longitude</div>
                    <div className="font-medium text-gray-800">{parseFloat(selectedVehicle.lng)?.toFixed(4) || 'N/A'}</div>
                  </div>
                </div>
                
                {selectedVehicle.address && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-xs text-gray-500 mb-1">Address</div>
                    <div className="text-sm text-gray-800">{selectedVehicle.address}</div>
                  </div>
                )}
                
                <div className="text-xs text-gray-500 pt-2 border-t border-gray-200">
                  Last Update: {new Date(selectedVehicle.last_update).toLocaleString()}
                </div>
                
                <button
                  onClick={() => {
                    const lat = parseFloat(selectedVehicle.lat);
                    const lng = parseFloat(selectedVehicle.lng);
                    if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
                      setMapCenter([lat, lng]);
                      setMapZoom(13);
                    }
                  }}
                  className="w-full px-3 py-2 bg-[#1e3a8a] text-white rounded-lg text-sm font-medium hover:bg-[#1e40af] transition-colors flex items-center justify-center gap-2"
                >
                  <span>🎯</span> Center on Map
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveMap;