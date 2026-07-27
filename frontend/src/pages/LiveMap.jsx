import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import client from '../api/client';
import 'leaflet/dist/leaflet.css';
import './LiveMap.css';

// Fix for default marker icons in Leaflet
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
        setMapZoom(10);
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
      'available': '#10B981', // green
      'in_use': '#3B82F6', // blue
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal mx-auto mb-4"></div>
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
            className="mt-4 px-4 py-2 bg-teal text-white rounded-lg hover:bg-teal/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Live Fleet Map</h1>
              <p className="text-sm text-gray-600">Real-time GPS tracking of your fleet vehicles</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900">{vehicles.length}</span> vehicles tracked
              </div>
              <button
                onClick={fetchLiveMapData}
                className="px-4 py-2 bg-teal text-white rounded-lg text-sm font-medium hover:bg-teal/90 transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-3 gap-6">
          {/* Map */}
          <div className="col-span-2 bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="h-[600px]">
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
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Vehicle List */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200">
                <h3 className="font-semibold text-gray-800">Fleet Vehicles</h3>
              </div>
              <div className="p-4 max-h-64 overflow-y-auto">
                {vehicles.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    <div className="text-2xl mb-2">🚗</div>
                    No vehicle locations available
                    <div className="text-xs mt-1">Drivers will appear when they report their location</div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {vehicles.map((vehicle) => (
                      <div
                        key={vehicle.vehicle_id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedVehicle?.vehicle_id === vehicle.vehicle_id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-blue-300'
                        }`}
                        onClick={() => {
                          setSelectedVehicle(vehicle);
                          if (vehicle.lat && vehicle.lng) {
                            setMapCenter([vehicle.lat, vehicle.lng]);
                            setMapZoom(13);
                          }
                        }}
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
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getStatusColor(vehicle.status) }}></div>
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
                )}
              </div>
            </div>

            {/* Selected Vehicle Details */}
            {selectedVehicle && (
              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-800">Vehicle Details</h3>
                </div>
                <div className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{getVehicleIcon(selectedVehicle.vehicle_type)}</span>
                      <div>
                        <div className="font-bold text-lg text-gray-800">{selectedVehicle.plate_number}</div>
                        <div className="text-sm text-gray-600">{selectedVehicle.vehicle_type}</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-600">Status:</span>
                        <div className="font-medium text-gray-800">{selectedVehicle.status}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Speed:</span>
                        <div className="font-medium text-gray-800">{selectedVehicle.speed_kmh || '0'} km/h</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Driver:</span>
                        <div className="font-medium text-gray-800">{selectedVehicle.driver_name || 'N/A'}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Coordinates:</span>
                        <div className="font-medium text-gray-800">
                          {selectedVehicle.lat?.toFixed(4) || 'N/A'}, {selectedVehicle.lng?.toFixed(4) || 'N/A'}
                        </div>
                      </div>
                    </div>
                    
                    {selectedVehicle.address && (
                      <div className="text-sm text-gray-600 mt-2">
                        <span className="font-medium">Location:</span> {selectedVehicle.address}
                      </div>
                    )}
                    
                    {selectedVehicle.status_update && (
                      <div className="text-sm text-blue-600 mt-2">
                        <span className="font-medium">Status Update:</span> {selectedVehicle.status_update}
                      </div>
                    )}
                    
                    <div className="text-xs text-gray-500 mt-3">
                      Last Update: {new Date(selectedVehicle.last_update).toLocaleString()}
                    </div>
                    
                    <button
                      onClick={() => {
                        if (selectedVehicle.lat && selectedVehicle.lng) {
                          setMapCenter([selectedVehicle.lat, selectedVehicle.lng]);
                          setMapZoom(13);
                        }
                      }}
                      className="w-full mt-3 px-3 py-2 bg-teal text-white rounded-lg text-sm font-medium hover:bg-teal/90 transition-colors"
                    >
                      Center on Map
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Legend */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200">
                <h3 className="font-semibold text-gray-800">Status Legend</h3>
              </div>
              <div className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#10B981' }}></div>
                  <span className="text-sm text-gray-600">Available</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#3B82F6' }}></div>
                  <span className="text-sm text-gray-600">In Use</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#F59E0B' }}></div>
                  <div className="text-sm text-gray-600">Maintenance</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#EF4444' }}></div>
                  <span className="text-sm text-gray-600">Out of Service</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveMap;